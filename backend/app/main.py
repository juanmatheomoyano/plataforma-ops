from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.core.database import AsyncSessionLocal
from app.modules.auth.router import router as auth_router
from app.modules.crud_medios.router import router as crud_medios_router
from app.modules.crud_medios.service import cleanup_old_operations
from app.modules.crud_medios.vtex_client import close_client as close_vtex_client
from app.modules.eventos.router import router as eventos_router
from app.modules.sellers.router import router as sellers_router
from app.modules.updates.router import public_router as updates_public_router
from app.modules.updates.router import router as updates_router
from app.modules.users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await cleanup_old_operations(db)
    yield
    await close_vtex_client()


app = FastAPI(title="Provincia Ops", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_ALLOWED_ORIGINS = [
    "tauri://localhost",
    "http://localhost:5173",
    "http://localhost:1420",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(sellers_router, prefix="/api")
app.include_router(crud_medios_router, prefix="/api")
app.include_router(eventos_router, prefix="/api")
app.include_router(updates_public_router)
app.include_router(updates_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
