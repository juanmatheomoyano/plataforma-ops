import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import client_ip, record_audit
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


@router.post("", response_model=SellerOut, status_code=201)
async def create_seller(
    request: Request,
    data: SellerCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["admin", "supervisor", "analista"])),
):
    created = await service.create_seller(data, db)
    await record_audit(
        db, action="seller.create", user=current_user,
        entity="seller", entity_id=created.seller_id, ip=client_ip(request),
        payload={"seller_id": created.seller_id, "seller_name": created.seller_name, "id_ecommerce": created.id_ecommerce},
    )
    return created


@router.get("/export")
async def export_sellers(
    request: Request,
    include_credentials: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export sellers.

    - `include_credentials=false` (default): xlsx plano, admin + supervisor.
    - `include_credentials=true`: solo admin. Devuelve un .zip AES-256 y expone
      el password en el header `X-Export-Password` (mostrar una sola vez al usuario).
    """
    if current_user.role not in (UserRole.admin, UserRole.supervisor):
        raise HTTPException(status_code=403, detail="Solo admin/supervisor")

    if include_credentials:
        if current_user.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Solo admin puede exportar con credenciales")
        import logging
        buf, password = await service.export_sellers_encrypted_zip(db)
        logging.getLogger("sellers.export").warning(
            "sellers_export_with_credentials user=%s user_id=%s bytes=%d",
            current_user.username, current_user.id, len(buf),
        )
        await record_audit(
            db, action="sellers.export.with_credentials", user=current_user,
            entity="sellers", ip=client_ip(request),
            payload={"bytes": len(buf)},
        )
        return StreamingResponse(
            io.BytesIO(buf),
            media_type="application/zip",
            headers={
                "Content-Disposition": "attachment; filename=sellers.zip",
                "X-Export-Password": password,
                "X-Export-Filename": "sellers.zip",
            },
        )

    buf = await service.export_sellers_xlsx(db)
    import logging
    logging.getLogger("sellers.export").info(
        "sellers_export user=%s user_id=%s bytes=%d",
        current_user.username, current_user.id, len(buf),
    )
    await record_audit(
        db, action="sellers.export", user=current_user,
        entity="sellers", ip=client_ip(request),
        payload={"bytes": len(buf)},
    )
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


@router.post("/sync-marketplace", dependencies=[_admin_supervisor])
async def sync_marketplace(db: AsyncSession = Depends(get_db)):
    return await service.sync_marketplace_sellers(db)



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


@router.patch("/{seller_id}", response_model=SellerOut)
async def update_seller(
    request: Request,
    seller_id: uuid.UUID,
    data: SellerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["admin", "supervisor", "analista"])),
):
    updated = await service.update_seller(seller_id, data, db)
    await record_audit(
        db, action="seller.update", user=current_user,
        entity="seller", entity_id=updated.seller_id, ip=client_ip(request),
        payload=data.model_dump(exclude_unset=True),
    )
    return updated


@router.post("/{seller_id}/deactivate", response_model=SellerOut)
async def deactivate_seller(
    request: Request,
    seller_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["admin", "supervisor", "analista"])),
):
    result = await service.deactivate_seller(seller_id, db)
    await record_audit(
        db, action="seller.deactivate", user=current_user,
        entity="seller", entity_id=result.seller_id, ip=client_ip(request),
    )
    return result


@router.post("/{seller_id}/test-connection", dependencies=[_admin_supervisor])
async def test_connection(seller_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await service.test_connection(seller_id, db)


@router.post("/{seller_id}/marketplace-toggle", response_model=SellerOut)
async def marketplace_toggle(
    request: Request,
    seller_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["admin", "supervisor"])),
):
    result = await service.toggle_marketplace_seller(seller_id, db)
    await record_audit(
        db, action="seller.marketplace_toggle", user=current_user,
        entity="seller", entity_id=result.seller_id, ip=client_ip(request),
        payload={"marketplace_activo": result.marketplace_activo},
    )
    return result
