import asyncio
import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.core.database import AsyncSessionLocal
from app.core.logging_config import RequestIdMiddleware, configure_logging
from app.core.observability import init_sentry
from app.core.scheduler import job_lock

# Logging + Sentry deben inicializarse antes de crear la app para capturar todo
configure_logging()
init_sentry()
from app.modules.auditoria.router import router as auditoria_router
from app.modules.auth.router import router as auth_router
from app.modules.crud_medios.router import router as crud_medios_router
from app.modules.crud_medios.service import cleanup_old_operations
from app.modules.crud_medios.vtex_client import close_client as close_vtex_client
from app.modules.eventos.router import router as eventos_router
from app.modules.sellers.marketplace_client import close_client as close_marketplace_client
from app.modules.sellers.router import router as sellers_router
from app.modules.sellers.service import sync_marketplace_sellers
from app.modules.updates.router import public_router as updates_public_router
from app.modules.updates.router import router as updates_router
from app.modules.users.router import router as users_router

_logger = logging.getLogger(__name__)


_MARKETPLACE_SYNC_JOB = "marketplace_sync"
_MARKETPLACE_SYNC_TTL_SECONDS = 30 * 60  # 30 min — cubre worst case de sync completo


async def _run_marketplace_sync(label: str) -> None:
    """Ejecuta el sync marketplace bajo lock DB. No re-raise: solo loguea."""
    try:
        async with AsyncSessionLocal() as db:
            async with job_lock(db, _MARKETPLACE_SYNC_JOB, _MARKETPLACE_SYNC_TTL_SECONDS) as acquired:
                if not acquired:
                    _logger.info("Marketplace sync (%s) skipped: otra réplica corriendo", label)
                    return
                await sync_marketplace_sellers(db)
    except Exception as e:
        _logger.warning("Marketplace sync (%s) falló (no fatal): %s", label, e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Limpieza de historial — IO contra BD propia, seguro dentro del lifespan.
    async with AsyncSessionLocal() as db:
        await cleanup_old_operations(db)

    # Sync marketplace en background — NO bloquea el startup ni el health check.
    # Si el marketplace está caído, la app arranca igual y el sync fallará silenciosamente.
    startup_task = asyncio.create_task(_run_marketplace_sync("startup"))

    # Sync diario programado.
    scheduler = AsyncIOScheduler()
    scheduler.add_job(lambda: asyncio.create_task(_run_marketplace_sync("daily")), "interval", hours=24)
    scheduler.start()

    yield

    scheduler.shutdown()
    # Esperamos el startup task si sigue corriendo, con timeout corto — evitamos hang al apagar.
    if not startup_task.done():
        startup_task.cancel()
        try:
            await asyncio.wait_for(startup_task, timeout=2.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
    await close_vtex_client()
    await close_marketplace_client()


app = FastAPI(title="Provincia Ops", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_ALLOWED_ORIGINS = [
    # Tauri 2 Windows (webview2)
    "http://tauri.localhost",
    "https://tauri.localhost",
    # Tauri 2 macOS/Linux
    "tauri://localhost",
    # Dev local (Vite)
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Export-Password", "X-Export-Filename", "X-Request-ID"],
)
# Request ID middleware — inyecta uuid por request para trazar logs.
app.add_middleware(RequestIdMiddleware)

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(sellers_router, prefix="/api")
app.include_router(crud_medios_router, prefix="/api")
app.include_router(eventos_router, prefix="/api")
app.include_router(auditoria_router, prefix="/api")
app.include_router(updates_public_router)
app.include_router(updates_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
