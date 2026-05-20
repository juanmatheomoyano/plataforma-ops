from fastapi import FastAPI

from app.core.config import settings

app = FastAPI(title="Plataforma Ops")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
