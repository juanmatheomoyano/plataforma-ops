"""
Servicio Payway — Fase 1 (validate) + Fase 2 (report).

Todo efímero: credenciales nunca se persisten en la BD, viven en memoria
durante el job async.

Fases:
    - `validate_credentials()` — login SAC de prueba por credencial.
    - `run_report()` — descarga masiva día-por-día por site, paraleliza
      por usuario (no por site: reusar la misma sesión SAC). Genera XLSX
      consolidado y lo deja en el Job para stream posterior.

Fase 3 (rotation) queda para más adelante.
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import date, timedelta

from .excel_io import build_consolidado_xlsx
from .jobs import Job, store
from .sac_client import SACClient, SACSite

logger = logging.getLogger(__name__)

# Concurrencia limitada — el SAC va lento, más de 5 logins en paralelo
# empieza a devolver timeouts. Ajustar cuando empíricamente veamos.
_VALIDATION_CONCURRENCY = 5

# Descargas: 1 worker por usuario (no paralelizar sites de un mismo usuario
# porque comparten la sesión SAC — 2 hits paralelos rompen la cookie).
# 10 usuarios en paralelo funciona bien empíricamente en el standalone.
_REPORT_USER_CONCURRENCY = 10

# Retry por día con backoff simple
_MAX_RETRIES_PER_DAY = 3
_RETRY_WAIT_SECONDS = 2

# Pausa mínima entre requests para no golpear demasiado al SAC
_INTER_DAY_SLEEP = 0.25


@dataclass
class CredentialValidation:
    username: str
    ok: bool
    sites: list[SACSite] = field(default_factory=list)
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "ok": self.ok,
            "sites_count": len(self.sites),
            "sites": [{"idsite": s.idsite, "nombre": s.nombre} for s in self.sites],
            "error": self.error,
        }


@dataclass
class CredentialValidationSummary:
    ambiente: str
    total: int
    ok: int
    error: int
    total_sites: int
    results: list[CredentialValidation]

    def to_dict(self) -> dict:
        return {
            "ambiente": self.ambiente,
            "total": self.total,
            "ok": self.ok,
            "error": self.error,
            "total_sites": self.total_sites,
            "results": [r.to_dict() for r in self.results],
        }


async def validate_credentials(
    credentials: list[dict],
    ambiente: str = "produccion",
) -> CredentialValidationSummary:
    """
    Para cada credencial, hace login SAC de prueba y obtiene los sites.

    Corre en paralelo con Semaphore(5) — sin esto, el SAC devuelve 429 o
    corta conexiones. Con 5, ~600 sellers / 60 users tardan ~1-2 min.
    """
    sem = asyncio.Semaphore(_VALIDATION_CONCURRENCY)

    async def _validate_one(cred: dict) -> CredentialValidation:
        async with sem:
            username = cred["username"]
            password = cred["password"]
            try:
                async with SACClient(ambiente) as client:
                    ok = await client.login(username, password)
                    if not ok:
                        return CredentialValidation(
                            username=username,
                            ok=False,
                            error="Login fallido — credenciales inválidas o SAC caído",
                        )
                    sites = await client.get_sites()
                    if not sites:
                        return CredentialValidation(
                            username=username,
                            ok=False,
                            error="Login OK pero el usuario no tiene sites asignados",
                        )
                    return CredentialValidation(username=username, ok=True, sites=sites)
            except Exception as e:
                logger.warning("payway.validate error user=%s: %s", username, e)
                return CredentialValidation(username=username, ok=False, error=str(e))

    results = await asyncio.gather(*(_validate_one(c) for c in credentials))

    ok_count = sum(1 for r in results if r.ok)
    return CredentialValidationSummary(
        ambiente=ambiente,
        total=len(results),
        ok=ok_count,
        error=len(results) - ok_count,
        total_sites=sum(len(r.sites) for r in results),
        results=results,
    )


# ─── Fase 2 · Descarga de reporte ─────────────────────────────────────────


@dataclass
class SiteReportResult:
    """Resultado de descargar todos los días de un site."""
    username: str
    idsite: str
    nombre: str
    rows: int = 0
    days_ok: int = 0
    days_error: int = 0
    error: str | None = None


async def run_report(
    job: Job,
    credentials: list[dict],
    date_from: date,
    date_to: date,
    estado_id: str = "0",
    ambiente: str = "produccion",
) -> None:
    """
    Descarga masiva paralela para el rango [date_from, date_to] inclusive.

    Paraleliza por usuario (Semaphore(10)). Para cada usuario:
      - Un solo login SAC (reusa la cookie)
      - Descarga sites secuencialmente (no romper la sesión)
      - Descarga días secuencialmente por site (deduplicando por Id_Operacion)

    El progreso se persiste en `job.processed_units` (días procesados) sobre
    `job.total_units` (días × sites totales). El frontend hace polling cada 2s.

    Al terminar, genera el XLSX consolidado y lo deja en `job.result_xlsx`.
    """
    job.status = "running"
    job.started_at = time.time()
    await store.update(job)

    # Precomputamos total_units haciendo un login rápido para saber cuántos
    # sites tiene cada usuario. En la práctica es mejor pasarlo desde afuera
    # (el frontend ya lo tiene del validate) — acá lo calculamos como fallback.
    #
    # Nota: `credentials` acá ya viene validado desde el endpoint, cada dict
    # incluye "username", "password", "sites" (lista de {idsite, nombre}).
    days_span = (date_to - date_from).days + 1
    total_sites = sum(len(c.get("sites", [])) for c in credentials)
    job.total_units = total_sites * days_span
    await store.update(job)

    logger.info(
        "payway.report started job=%s creds=%d sites=%d span=%d days -> total=%d units",
        job.id, len(credentials), total_sites, days_span, job.total_units,
    )

    # Lista mutable compartida entre workers — cada uno appendea sus filas.
    # No hace falta lock: solo appends, y GIL garantiza atomicidad para .append().
    all_rows: list[list[str]] = []
    site_results: list[SiteReportResult] = []

    sem = asyncio.Semaphore(_REPORT_USER_CONCURRENCY)

    async def _process_user(cred: dict) -> None:
        async with sem:
            username = cred["username"]
            password = cred["password"]
            sites_meta = cred.get("sites", [])

            if not sites_meta:
                # Sin sites -> nada para descargar. Registramos error para reportar.
                site_results.append(SiteReportResult(
                    username=username, idsite="", nombre="",
                    error="Sin sites asignados",
                ))
                return

            try:
                async with SACClient(ambiente) as client:
                    if not await client.login(username, password):
                        for s in sites_meta:
                            site_results.append(SiteReportResult(
                                username=username,
                                idsite=s.get("idsite", ""),
                                nombre=s.get("nombre", ""),
                                error="Login fallido",
                            ))
                            # Contamos como procesados para no colgar el %
                            job.processed_units += days_span
                        await store.update(job)
                        return

                    for site_meta in sites_meta:
                        result = await _download_site(
                            client, username,
                            site_meta.get("idsite", ""),
                            site_meta.get("nombre", ""),
                            date_from, date_to, estado_id,
                            all_rows,
                            job,
                        )
                        site_results.append(result)
                        await store.update(job)

            except Exception as e:
                logger.warning("payway.report user=%s exception: %s", username, e, exc_info=True)
                for s in sites_meta:
                    site_results.append(SiteReportResult(
                        username=username,
                        idsite=s.get("idsite", ""),
                        nombre=s.get("nombre", ""),
                        error=f"Excepción: {e}",
                    ))

    try:
        await asyncio.gather(*(_process_user(c) for c in credentials))
    except Exception as e:
        job.status = "error"
        job.error_message = f"Fallo general: {e}"
        job.finished_at = time.time()
        await store.update(job)
        logger.exception("payway.report job=%s failed", job.id)
        return

    # Consolidado XLSX en memoria
    try:
        job.result_xlsx = build_consolidado_xlsx(all_rows)
    except Exception as e:
        job.status = "error"
        job.error_message = f"No se pudo generar el XLSX: {e}"
        job.finished_at = time.time()
        await store.update(job)
        logger.exception("payway.report job=%s xlsx build failed", job.id)
        return

    ok_sites = sum(1 for s in site_results if not s.error)
    err_sites = len(site_results) - ok_sites
    job.meta = {
        "total_rows": len(all_rows),
        "sites_ok": ok_sites,
        "sites_error": err_sites,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "estado_id": estado_id,
        "site_results": [
            {
                "username": s.username,
                "idsite": s.idsite,
                "nombre": s.nombre,
                "rows": s.rows,
                "days_ok": s.days_ok,
                "days_error": s.days_error,
                "error": s.error,
            }
            for s in site_results
        ],
    }
    job.status = "done"
    job.finished_at = time.time()
    await store.update(job)
    logger.info(
        "payway.report done job=%s rows=%d sites=%d/%d ok",
        job.id, len(all_rows), ok_sites, len(site_results),
    )


async def _download_site(
    client: SACClient,
    username: str,
    idsite: str,
    nombre: str,
    date_from: date,
    date_to: date,
    estado_id: str,
    all_rows: list[list[str]],
    job: Job,
) -> SiteReportResult:
    """
    Descarga día por día un site completo. Reintenta hasta 3 veces por día.
    Deduplica por Id_Operacion (primera columna del TSV).
    """
    result = SiteReportResult(username=username, idsite=idsite, nombre=nombre)
    seen: set[str] = set()
    current = date_from
    while current <= date_to:
        last_error: str | None = None
        for attempt in range(1, _MAX_RETRIES_PER_DAY + 1):
            dl = await client.download_day(idsite, current, estado_id)
            if not dl.error:
                # OK — dedup y append
                for row in dl.rows:
                    if row and row[0] and row[0] not in seen:
                        seen.add(row[0])
                        all_rows.append(row)
                        result.rows += 1
                last_error = None
                break
            last_error = dl.error
            if attempt < _MAX_RETRIES_PER_DAY:
                await asyncio.sleep(_RETRY_WAIT_SECONDS)

        if last_error:
            result.days_error += 1
        else:
            result.days_ok += 1

        job.processed_units += 1
        current += timedelta(days=1)
        await asyncio.sleep(_INTER_DAY_SLEEP)

    if result.days_ok == 0 and result.days_error > 0:
        result.error = f"{result.days_error} día(s) fallidos"
    return result
