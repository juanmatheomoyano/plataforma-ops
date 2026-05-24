import uuid

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role

from . import service
from .schemas import SellerCreate, SellerImportResult, SellerOut, SellerUpdate

router = APIRouter(prefix="/sellers", tags=["sellers"])

_auth = Depends(get_current_user)
_admin = Depends(require_role(["admin"]))


@router.get("", response_model=list[SellerOut], dependencies=[_auth])
async def list_sellers(
    skip: int = 0, limit: int = 200, db: AsyncSession = Depends(get_db)
):
    return await service.get_all_sellers(db, skip=skip, limit=limit)


# /import MUST be defined before /{seller_id} to avoid path collision
@router.post("/import", response_model=SellerImportResult, dependencies=[_admin])
async def import_sellers(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    return await service.import_sellers_from_file(file, db)


@router.get("/{seller_id}", response_model=SellerOut, dependencies=[_auth])
async def get_seller(seller_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await service.get_seller_by_id(seller_id, db)


@router.post("", response_model=SellerOut, status_code=201, dependencies=[_admin])
async def create_seller(data: SellerCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_seller(data, db)


@router.patch("/{seller_id}", response_model=SellerOut, dependencies=[_admin])
async def update_seller(
    seller_id: uuid.UUID, data: SellerUpdate, db: AsyncSession = Depends(get_db)
):
    return await service.update_seller(seller_id, data, db)


@router.post("/{seller_id}/deactivate", response_model=SellerOut, dependencies=[_admin])
async def deactivate_seller(seller_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await service.deactivate_seller(seller_id, db)


@router.post("/{seller_id}/test-connection", dependencies=[_admin])
async def test_connection(seller_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await service.test_connection(seller_id, db)
