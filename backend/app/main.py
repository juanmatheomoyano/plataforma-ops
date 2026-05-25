from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.sellers.router import router as sellers_router
from app.modules.crud_medios.router import router as crud_medios_router
from app.modules.updates.router import router as updates_router

app = FastAPI(title="Plataforma Ops")

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
app.include_router(updates_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
