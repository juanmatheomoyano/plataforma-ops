import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.modules.auth.models import User

from .schemas import ChangePassword, UserCreate, UserUpdate


async def get_all_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    return list(result.scalars().all())


async def get_user_by_id(user_id: uuid.UUID, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def create_user(data: UserCreate, db: AsyncSession) -> User:
    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists",
        )
    return user


async def update_user(user_id: uuid.UUID, data: UserUpdate, db: AsyncSession) -> User:
    user = await get_user_by_id(user_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use",
        )
    return user


async def deactivate_user(
    user_id: uuid.UUID, current_user_id: uuid.UUID, db: AsyncSession
) -> User:
    if user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )
    user = await get_user_by_id(user_id, db)
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return user


async def reset_password(
    user_id: uuid.UUID, data: ChangePassword, db: AsyncSession
) -> User:
    user = await get_user_by_id(user_id, db)
    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    await db.refresh(user)
    return user
