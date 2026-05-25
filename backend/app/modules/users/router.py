import io
import uuid

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role

from . import service
from .schemas import ChangePassword, SelfChangePassword, UserCreate, UserImportUpdateResult, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

_admin = Depends(require_role(["admin"]))


@router.get("", response_model=list[UserOut], dependencies=[_admin])
async def list_users(db: AsyncSession = Depends(get_db)):
    return await service.get_all_users(db)


@router.get("/export", dependencies=[_admin])
async def export_users(db: AsyncSession = Depends(get_db)):
    buf = await service.export_users_xlsx(db)
    return StreamingResponse(
        io.BytesIO(buf),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=usuarios.xlsx"},
    )


@router.post("/import-update", response_model=UserImportUpdateResult, dependencies=[_admin])
async def import_update_users(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    return await service.import_update_users(file, db)


@router.post("/me/change-password", status_code=204)
async def change_own_password(
    data: SelfChangePassword,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.change_own_password(current_user, data, db)


@router.get("/{user_id}", response_model=UserOut, dependencies=[_admin])
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await service.get_user_by_id(user_id, db)


@router.post("", response_model=UserOut, status_code=201, dependencies=[_admin])
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_user(data, db)


@router.patch("/{user_id}", response_model=UserOut, dependencies=[_admin])
async def update_user(
    user_id: uuid.UUID, data: UserUpdate, db: AsyncSession = Depends(get_db)
):
    return await service.update_user(user_id, data, db)


@router.post("/{user_id}/deactivate", response_model=UserOut)
async def deactivate_user(
    user_id: uuid.UUID,
    current_user=Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
):
    return await service.deactivate_user(user_id, current_user.id, db)


@router.post("/{user_id}/reset-password", response_model=UserOut, dependencies=[_admin])
async def reset_password(
    user_id: uuid.UUID, data: ChangePassword, db: AsyncSession = Depends(get_db)
):
    return await service.reset_password(user_id, data, db)
