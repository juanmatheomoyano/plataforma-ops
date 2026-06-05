import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.auth.models import User, UserRole

from . import service
from .models import IntegracionSpec
from .schemas import (
    AnalistaOut,
    IntegracionSpecCreate,
    IntegracionSpecOut,
    SellerCreate,
    SellerImportResult,
    SellerImportUpdateResult,
    SellerOut,
    SellerUpdate,
)

router = APIRouter(prefix="/sellers", tags=["sellers"])

_auth = Depends(get_current_user)
_admin = Depends(require_role(["admin"]))
_admin_supervisor = Depends(require_role(["admin", "supervisor"]))
_admin_supervisor_analista = Depends(require_role(["admin", "supervisor", "analista"]))

INTEGRACIONES = [
    "Base", "Desarrollo propio", "DUX Software", "EcomExperts",
    "Externa", "Fulljaus", "Grow2On de Wualá", "Heaven", "Hypevar",
    "Manual", "No VTEX", "Pierce", "Producteca", "Propia",
    "Seller Manager", "Sincroshops", "Yiqi",
]


# ── Static paths MUST come before /{seller_id} to avoid path collision ─────────

@router.get("", response_model=list[SellerOut], dependencies=[_auth])
async def list_sellers(
    skip: int = 0, limit: int = 200, db: AsyncSession = Depends(get_db)
):
    return await service.get_all_sellers(db, skip=skip, limit=limit)


@router.post("", response_model=SellerOut, status_code=201, dependencies=[_admin_supervisor_analista])
async def create_seller(data: SellerCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_seller(data, db)


@router.get("/export", dependencies=[_admin_supervisor])
async def export_sellers(db: AsyncSession = Depends(get_db)):
    buf = await service.export_sellers_xlsx(db)
    return StreamingResponse(
        io.BytesIO(buf),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=sellers.xlsx"},
    )


# /import MUST be before /{seller_id}
@router.post("/import", response_model=SellerImportResult, dependencies=[_admin_supervisor])
async def import_sellers(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    return await service.import_sellers_from_file(file, db)


@router.post("/import-update", response_model=SellerImportUpdateResult, dependencies=[_admin_supervisor])
async def import_update_sellers(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    return await service.import_update_sellers(file, db)


@router.get("/analistas", response_model=list[AnalistaOut], dependencies=[_auth])
async def list_analistas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .where(
            User.is_active.is_(True),
            User.role.in_([UserRole.admin, UserRole.supervisor, UserRole.analista]),
        )
        .order_by(User.full_name)
    )
    return list(result.scalars().all())


@router.get("/integraciones", dependencies=[_auth])
async def list_integraciones():
    return INTEGRACIONES


@router.post("/integraciones/specs", response_model=IntegracionSpecOut, status_code=201)
async def create_spec(
    data: IntegracionSpecCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    spec = IntegracionSpec(
        integracion=data.integracion,
        spec=data.spec,
        created_by=current_user.username,
    )
    db.add(spec)
    try:
        await db.commit()
        await db.refresh(spec)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Spec ya existe para esta integración")
    return spec


@router.get("/integraciones/{integracion}/specs", response_model=list[IntegracionSpecOut], dependencies=[_auth])
async def list_specs(integracion: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(IntegracionSpec)
        .where(IntegracionSpec.integracion == integracion)
        .order_by(IntegracionSpec.spec)
    )
    return list(result.scalars().all())


# ── Dynamic /{seller_id} paths ─────────────────────────────────────────────────

@router.get("/{seller_id}", response_model=SellerOut, dependencies=[_auth])
async def get_seller(seller_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await service.get_seller_by_id(seller_id, db)


@router.patch("/{seller_id}", response_model=SellerOut, dependencies=[_admin_supervisor_analista])
async def update_seller(
    seller_id: uuid.UUID, data: SellerUpdate, db: AsyncSession = Depends(get_db)
):
    return await service.update_seller(seller_id, data, db)


@router.post("/{seller_id}/deactivate", response_model=SellerOut, dependencies=[_admin_supervisor_analista])
async def deactivate_seller(seller_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await service.deactivate_seller(seller_id, db)


@router.post("/{seller_id}/test-connection", dependencies=[_admin_supervisor])
async def test_connection(seller_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await service.test_connection(seller_id, db)
