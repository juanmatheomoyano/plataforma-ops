import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.sellers.models import EstadoKeys, Seller

from .models import CrudOperation
from .schemas import CrudRequest, CrudResponse, OperationSummary, SellerScopeOut
from .service import cleanup_old_operations, get_active_sellers, run_crud_operation

router = APIRouter(prefix="/crud-medios", tags=["crud-medios"])

_WRITE_ROLES = {"admin", "analista_senior"}


@router.post("/execute", response_model=CrudResponse)
async def execute_crud(
    body: CrudRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if body.operacion in ("C", "U", "D") and not body.dry_run:
        if current_user.role.value not in _WRITE_ROLES:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    return await run_crud_operation(db, current_user.id, body)


@router.get("/operations", response_model=list[OperationSummary])
async def list_operations(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    is_admin = current_user.role.value == "admin"

    q = (
        select(CrudOperation, User.username)
        .join(User, CrudOperation.user_id == User.id)
        .order_by(CrudOperation.started_at.desc())
        .limit(200)
    )
    if not is_admin:
        q = q.where(CrudOperation.user_id == current_user.id)

    result = await db.execute(q)
    rows = result.all()

    return [
        OperationSummary(
            id=op.id,
            operacion=op.operacion,
            dry_run=op.dry_run,
            total_sellers=len(op.sellers_scope),
            total_matched=op.total_matched,
            total_success=op.total_success,
            total_errors=op.total_errors,
            duration_secs=op.duration_secs,
            started_at=op.started_at,
            finished_at=op.finished_at,
            username=username,
        )
        for op, username in rows
    ]


@router.get("/operations/{operation_id}", response_model=CrudResponse)
async def get_operation(
    operation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    is_admin = current_user.role.value == "admin"

    q = (
        select(CrudOperation)
        .where(CrudOperation.id == operation_id)
        .options(selectinload(CrudOperation.rows))
    )
    if not is_admin:
        q = q.where(CrudOperation.user_id == current_user.id)

    result = await db.execute(q)
    op = result.scalar_one_or_none()
    if op is None:
        raise HTTPException(status_code=404, detail="Operation not found")

    rows = [
        {
            "seller_id": r.seller_id,
            "rule_id": r.rule_id,
            "rule_name": r.rule_name,
            "brand": r.brand,
            "level": r.level,
            "estado": r.estado,
            "detalle": r.detalle,
        }
        for r in op.rows
    ]
    return CrudResponse(
        operation_id=op.id,
        operacion=op.operacion,
        dry_run=op.dry_run,
        total_sellers=len(op.sellers_scope),
        total_matched=op.total_matched,
        total_success=op.total_success,
        total_errors=op.total_errors,
        duration_secs=op.duration_secs,
        rows=rows,
    )


@router.get("/sellers", response_model=list[SellerScopeOut])
async def list_sellers_scope(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sellers = await get_active_sellers(db)
    return sellers


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total_activos = await db.scalar(
        select(func.count()).select_from(Seller).where(Seller.is_active.is_(True))
    )
    total_inactivos = await db.scalar(
        select(func.count()).select_from(Seller).where(Seller.is_active.is_(False))
    )
    total_vencidas = await db.scalar(
        select(func.count()).select_from(Seller).where(
            Seller.estado_keys == EstadoKeys.vencido,
            Seller.is_active.is_(True),
        )
    )
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    total_ops_hoy = await db.scalar(
        select(func.count()).select_from(CrudOperation).where(
            CrudOperation.started_at >= today_start
        )
    )

    total_usuarios_activos = None
    ultimo_operador = None
    if current_user.role.value == "admin":
        total_usuarios_activos = await db.scalar(
            select(func.count()).select_from(User).where(User.is_active.is_(True))
        )
        row = await db.execute(
            select(User.username)
            .join(CrudOperation, CrudOperation.user_id == User.id)
            .order_by(CrudOperation.started_at.desc())
            .limit(1)
        )
        ultimo_operador = row.scalar_one_or_none()

    return {
        "total_sellers_activos": total_activos,
        "total_sellers_inactivos": total_inactivos,
        "total_sellers_keys_vencidas": total_vencidas,
        "total_operaciones_hoy": total_ops_hoy,
        "total_usuarios_activos": total_usuarios_activos,
        "ultimo_operador": ultimo_operador,
    }


@router.post("/cleanup")
async def cleanup_history(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    deleted = await cleanup_old_operations(db)
    return {"deleted": deleted}
