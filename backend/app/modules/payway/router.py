"""
Router Payway.

Fase 1: `POST /validate` — sube xlsx, hace login SAC de prueba, devuelve estados.
Fase 2: `POST /reports/generate` + `GET /jobs/{id}` + `GET /jobs/{id}/download`
         — descarga masiva paralela con progress bar por polling, XLSX consolidado
         que se stream-ea al browser al finalizar.

Nada persiste: credenciales viven solo en memoria durante el job. El XLSX
resultado vive en el JobStore con TTL de 30 min y después se purga.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import require_role
from app.modules.auth.models import User

from .excel_io import InvalidPaywayKeysFile, read_payway_keys
from .jobs import Job, store
from .sac_client import SAC_ESTADO_IDS
from .service import run_report, validate_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payway", tags=["payway"])

# 5 MB — tope generoso para el PaywayKeys.xlsx (típico son ~50 KB).
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024

# Ambiente hardcoded a producción — el sandbox se descarto para simplificar UX
# (el SAC de sandbox no tiene datos útiles para operar). El param queda solo
# como constante interna por si en el futuro se quiere reabrir sandbox.
_AMBIENTE = "produccion"


# ─── Fase 1: validate ─────────────────────────────────────────────────────


@router.post("/validate", status_code=status.HTTP_202_ACCEPTED)
async def validate_payway_keys(
    file: UploadFile = File(...),
    user: User = Depends(require_role(["admin", "supervisor", "analista"])),
) -> dict:
    """
    Sube el `PaywayKeys.xlsx` y arranca la validación en background.
    Devuelve `job_id` inmediatamente — el frontend hace polling a
    `GET /validate-jobs/{id}` cada 1s hasta que status=done|error.

    Evita el timeout de Railway (300s) con 600+ credenciales.
    """
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se esperaba un archivo .xlsx",
        )

    data = await file.read()
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Archivo demasiado grande (máx {_MAX_UPLOAD_BYTES // 1024} KB)",
        )

    try:
        creds = read_payway_keys(data)
    except InvalidPaywayKeysFile as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    job = await store.create(kind="validate", user_id=str(user.id))
    logger.info("payway.validate scheduled job=%s user=%s creds=%d", job.id, user.username, len(creds))

    async def _run() -> None:
        try:
            summary = await validate_credentials(creds, ambiente=_AMBIENTE, job=job)
            job.meta = {"summary": summary.to_dict()}
            job.status = "done"
            logger.info(
                "payway.validate done job=%s user=%s ok=%d/%d sites=%d",
                job.id, user.username, summary.ok, summary.total, summary.total_sites,
            )
        except Exception as e:
            logger.exception("payway.validate failed job=%s", job.id)
            job.status = "error"
            job.error_message = str(e)
        job.finished_at = time.time()
        await store.update(job)

    asyncio.create_task(_run())
    return {"job_id": job.id, "status": job.status}


@router.get("/validate-jobs/{job_id}")
async def get_validate_job(
    job_id: str,
    user: User = Depends(require_role(["admin", "supervisor", "analista"])),
) -> dict:
    """
    Polling del estado de un job de validación. Devuelve progreso y,
    cuando status=done, el summary completo con resultados por credencial.
    """
    job = await store.get(job_id)
    if not job or job.user_id != str(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado")
    result = {
        "job_id": job.id,
        "status": job.status,
        "processed_units": job.processed_units,
        "total_units": job.total_units,
        "error_message": job.error_message,
        "summary": None,
    }
    if job.status == "done":
        result["summary"] = (job.meta or {}).get("summary")
    return result


# ─── Fase 2: reports (async job) ──────────────────────────────────────────


@router.get("/estados")
async def list_estados(
    user: User = Depends(require_role(["admin", "supervisor", "analista"])),
) -> list[dict]:
    """
    Catálogo de estados SAC disponibles para el filtro del reporte.
    (Útil para el frontend renderizar un select.)
    """
    return [{"label": name, "id": value} for name, value in SAC_ESTADO_IDS.items()]


@router.post("/reports/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_report(
    file: UploadFile = File(...),
    date_from: str = Form(...),  # YYYY-MM-DD
    date_to: str = Form(...),
    estado_id: str = Form("0"),
    # Cuando el frontend viene del validate, ya sabe qué usernames tienen sites.
    # Enviarlos como JSON opcional evita re-hacer los logins solo para descubrir sites.
    validated_sites_json: str | None = Form(None),
    user: User = Depends(require_role(["admin", "supervisor", "analista"])),
) -> dict:
    """
    Arranca el job de descarga en background y devuelve `job_id` para polling.

    El frontend puede pasar `validated_sites_json` con el output del `/validate`
    para saltear el paso de descubrimiento. Formato:
        [
          {"username": "juan.p", "sites": [{"idsite": "00060644", "nombre": "..."}]},
          ...
        ]
    Si no se pasa, hacemos login inicial durante el job para obtener sites.
    """
    # ── Validación de inputs ──
    try:
        df = date.fromisoformat(date_from)
        dt = date.fromisoformat(date_to)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from/date_to deben tener formato YYYY-MM-DD",
        )
    if df > dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from debe ser <= date_to",
        )
    if (dt - df).days > 366:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rango máximo: 366 días",
        )

    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se esperaba un archivo .xlsx",
        )

    data = await file.read()
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Archivo demasiado grande (máx {_MAX_UPLOAD_BYTES // 1024} KB)",
        )

    try:
        creds = read_payway_keys(data)
    except InvalidPaywayKeysFile as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # ── Enriquecemos las credenciales con sites (de validated_sites_json o vacío) ──
    sites_by_user: dict[str, list[dict]] = {}
    if validated_sites_json:
        try:
            data_json = json.loads(validated_sites_json)
            for entry in data_json:
                if isinstance(entry, dict) and "username" in entry:
                    sites_by_user[entry["username"]] = entry.get("sites", [])
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="validated_sites_json inválido — se esperaba JSON [{username, sites}, ...]",
            )

    enriched: list[dict] = []
    for c in creds:
        enriched.append({
            "username": c["username"],
            "password": c["password"],
            "sites": sites_by_user.get(c["username"], []),
        })

    # Si no vino `validated_sites_json`, resolvemos sites descubriéndolos ahora
    # con `validate_credentials()` (mismo login que hace el user en /validate).
    # Es más lento pero funciona sin pasar por el frontend.
    if not validated_sites_json:
        logger.info(
            "payway.reports.generate discovering sites user=%s creds=%d",
            user.username, len(creds),
        )
        summary = await validate_credentials(creds, ambiente=_AMBIENTE)
        result_map = {r.username: r for r in summary.results}
        enriched = [
            {
                "username": c["username"],
                "password": c["password"],
                "sites": [
                    {"idsite": s.idsite, "nombre": s.nombre}
                    for s in (result_map[c["username"]].sites if c["username"] in result_map else [])
                ],
            }
            for c in creds
        ]

    # ── Job async ──
    job = await store.create(kind="report", user_id=str(user.id))
    logger.info(
        "payway.reports.generate scheduled job=%s user=%s creds=%d rango=%s..%s",
        job.id, user.username, len(enriched), df, dt,
    )

    async def _wrap():
        try:
            await run_report(
                job, enriched, df, dt,
                estado_id=estado_id, ambiente=_AMBIENTE,
            )
        except Exception as e:
            logger.exception("payway.reports background failed job=%s", job.id)
            job.status = "error"
            job.error_message = str(e)
            await store.update(job)

    asyncio.create_task(_wrap())

    return {"job_id": job.id, "status": job.status}


@router.get("/jobs/{job_id}")
async def get_job(
    job_id: str,
    user: User = Depends(require_role(["admin", "supervisor", "analista"])),
) -> dict:
    """
    Polling del estado del job. Devuelve progreso + metadata.
    Frontend hace polling cada 2s hasta que status ∈ {done, error}.
    """
    job = await store.get(job_id)
    if not job or job.user_id != str(user.id):
        # Ocultamos existencia de jobs de otros usuarios.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado")
    return job.to_dict()


@router.get("/jobs/{job_id}/download")
async def download_job_result(
    job_id: str,
    user: User = Depends(require_role(["admin", "supervisor", "analista"])),
) -> StreamingResponse:
    """
    Descarga el XLSX consolidado del job. Solo válido cuando status=done.
    Después de esta descarga el job queda en el store hasta que expire el TTL
    (30 min), por si el user quiere re-descargar.
    """
    job = await store.get(job_id)
    if not job or job.user_id != str(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job no encontrado")
    if job.status != "done":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job no completado (status={job.status})",
        )
    if not job.result_xlsx:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Sin resultado")

    # v2.1.2+: el resultado ahora es un ZIP con Consolidado + XLSX por seller + Logs.
    fmt = (job.meta or {}).get("format", "zip")
    is_zip = fmt == "zip"
    ext = "zip" if is_zip else "xlsx"
    mime = "application/zip" if is_zip else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    filename = f"Payway_Reporte_{job.meta.get('date_from', '')}_{job.meta.get('date_to', '')}.{ext}"

    async def _iter():
        yield job.result_xlsx

    return StreamingResponse(
        _iter(),
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
