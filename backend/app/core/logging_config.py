"""Configuración de logging JSON estructurado + middleware de request_id.

En prod, cada log line es un JSON con:
    - timestamp (ISO)
    - level
    - logger (nombre del módulo)
    - message
    - request_id (uuid v4 por request, inyectado por middleware)
    - user_id / username / role (si el usuario está autenticado en la request)
    - exception info si hay traceback

En dev (APP_ENV=development), sigue con formato legible tipo `logging.INFO:app.main:mensaje`
para no romper la ergonomía del uvicorn --reload.
"""
import json
import logging
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app.core.config import settings

# ── Context vars ──────────────────────────────────────────────────────────────
# Estos se setean por request y quedan disponibles al formatter de logs.
_request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)
_user_id_ctx: ContextVar[str | None] = ContextVar("user_id", default=None)
_username_ctx: ContextVar[str | None] = ContextVar("username", default=None)
_role_ctx: ContextVar[str | None] = ContextVar("role", default=None)


def get_request_id() -> str | None:
    return _request_id_ctx.get()


def set_log_user(user_id: str, username: str, role: str) -> None:
    """Llamar desde el dependency de auth para etiquetar los logs de esta request."""
    _user_id_ctx.set(str(user_id))
    _username_ctx.set(username)
    _role_ctx.set(role)


# ── Formatter ─────────────────────────────────────────────────────────────────
class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        req_id = _request_id_ctx.get()
        if req_id:
            payload["request_id"] = req_id
        if _user_id_ctx.get():
            payload["user_id"] = _user_id_ctx.get()
            payload["username"] = _username_ctx.get()
            payload["role"] = _role_ctx.get()
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        # Cualquier extra pasado al log (logger.info("x", extra={"foo": 1})) se incluye
        for k, v in record.__dict__.items():
            if k in _RESERVED or k in payload:
                continue
            try:
                json.dumps(v)  # solo campos serializables
                payload[k] = v
            except (TypeError, ValueError):
                pass
        return json.dumps(payload, ensure_ascii=False, default=str)


_RESERVED = {
    "name", "msg", "args", "levelname", "levelno", "pathname", "filename", "module",
    "exc_info", "exc_text", "stack_info", "lineno", "funcName", "created", "msecs",
    "relativeCreated", "thread", "threadName", "processName", "process", "message",
    "taskName",
}


# ── Init ──────────────────────────────────────────────────────────────────────
def configure_logging() -> None:
    """Configura el root logger. Idempotente."""
    root = logging.getLogger()
    # Limpiar handlers previos (uvicorn agrega los suyos)
    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    if settings.APP_ENV == "development":
        # Formato legible para dev
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S",
        ))
    else:
        handler.setFormatter(JsonFormatter())

    root.addHandler(handler)
    root.setLevel(logging.INFO)

    # Silenciar los muy verbosos en prod
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


# ── Middleware ────────────────────────────────────────────────────────────────
class RequestIdMiddleware(BaseHTTPMiddleware):
    """Inyecta un request_id (uuid v4) por request y lo persiste en context vars.

    Si el cliente manda `X-Request-ID`, se respeta. Si no, se genera uno nuevo.
    El request_id se devuelve en el response header `X-Request-ID` para debug.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token_req = _request_id_ctx.set(req_id)
        token_uid = _user_id_ctx.set(None)
        token_un = _username_ctx.set(None)
        token_role = _role_ctx.set(None)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = req_id
            return response
        finally:
            _request_id_ctx.reset(token_req)
            _user_id_ctx.reset(token_uid)
            _username_ctx.reset(token_un)
            _role_ctx.reset(token_role)
