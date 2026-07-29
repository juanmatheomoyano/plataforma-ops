"""Sentry init + helpers.

Se inicializa solo si `SENTRY_DSN` está seteado. Sin DSN (dev local) no manda nada.
"""
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def init_sentry() -> None:
    if not settings.SENTRY_DSN:
        logger.info("Sentry deshabilitado (SENTRY_DSN vacío)")
        return

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        release=f"provincia-ops@{settings.APP_VERSION}",
        environment=settings.APP_ENV,
        traces_sample_rate=0.1,
        send_default_pii=False,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
    )
    logger.info("Sentry inicializado (env=%s, release=%s)", settings.APP_ENV, settings.APP_VERSION)


def set_sentry_user(user_id: str, username: str, role: str) -> None:
    """Marca el user actual en el scope de Sentry. No-op si Sentry no está activo."""
    if not settings.SENTRY_DSN:
        return
    try:
        import sentry_sdk
        sentry_sdk.set_user({"id": str(user_id), "username": username})
        sentry_sdk.set_tag("role", role)
    except Exception:
        pass
