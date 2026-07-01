from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
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
from app.modules.sellers.baproar_client import close_client as close_baproar_client
from app.modules.sellers.router import router as sellers_router
from app.modules.sellers.service import sync_marketplace_sellers
from app.modules.updates.router import public_router as updates_public_router
from app.modules.updates.router import router as updates_router
from app.modules.users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncSessionLocal() as db:
        await cleanup_old_operations(db)

    # Sync marketplace al arrancar — no fatal si falla
    try:
        async with AsyncSessionLocal() as db:
            await sync_marketplace_sellers(db)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Startup marketplace sync falló (no fatal): %s", e)

    # Sync diario automático
    async def _daily_sync():
        try:
            async with AsyncSessionLocal() as db:
                await sync_marketplace_sellers(db)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Daily marketplace sync falló: %s", e)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(_daily_sync, "interval", hours=24)
    scheduler.start()

    yield

    scheduler.shutdown()
    await close_vtex_client()
    await close_baproar_client()


app = FastAPI(title="Provincia Ops", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
