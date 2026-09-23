from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_role
from app.modules.auth.models import User

from .service import build_owner_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(["admin", "supervisor"])),
) -> dict:
    """
    KPIs y series para dashboard Owner/Admin v2.

    Roles v2 compatibles: `owner`, `admin`. Legacy: `admin`, `supervisor`.
    Cache in-memory 5 min por instancia.
    """
    return await build_owner_summary(db)
