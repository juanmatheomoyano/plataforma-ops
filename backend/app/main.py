from fastapi import FastAPI

from app.core.config import settings
from app.modules.auth.router import router as auth_router

app = FastAPI(title="Plataforma Ops")

app.include_router(auth_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
