from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user

from . import service
from .schemas import LoginRequest, RefreshRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await service.login(data, db)


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await service.refresh(data.refresh_token, db)


@router.post("/logout", status_code=204)
async def logout(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await service.logout(data.refresh_token, db)


@router.post("/bootstrap", include_in_schema=False)
async def bootstrap_admin(db: AsyncSession = Depends(get_db)):
    """Crea el primer usuario admin. Solo funciona si la BD está vacía."""
    from sqlalchemy import select, func
    from app.modules.auth.models import User

    count = await db.scalar(select(func.count()).select_from(User))
    if count > 0:
        raise HTTPException(status_code=403, detail="Bootstrap already done")

    from app.modules.users.service import create_user
    from app.modules.users.schemas import UserCreate

    user = await create_user(UserCreate(
        username="jmoyano",
        email="jmoyano@provincianet.com.ar",
        full_name="Juan Matheo Moyano",
        password="Admin.2026!",
        role="admin"
    ), db)
    return {"ok": True, "user_id": str(user.id)}
