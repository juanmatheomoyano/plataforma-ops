"""
Test local del flujo completo `run_report()` sin backend levantado.

Uso:
    ./venv/Scripts/python.exe scripts/test_payway_report.py <xlsx> <YYYY-MM-DD> <YYYY-MM-DD>

Ejemplo (1 día para validar rápido):
    ./venv/Scripts/python.exe scripts/test_payway_report.py \
        "C:/Users/juanm/OneDrive/Desktop/PaywayKeys.xlsx" 2026-09-15 2026-09-15

Ejemplo (rango semanal):
    ./venv/Scripts/python.exe scripts/test_payway_report.py \
        "C:/Users/juanm/OneDrive/Desktop/PaywayKeys.xlsx" 2026-09-01 2026-09-07

Output:
    - Progress cada 2s en consola
    - Al terminar: guarda el XLSX en scripts/_out/Payway_Report_YYYY-MM-DD_YYYY-MM-DD.xlsx
    - Muestra resumen (total filas, sites OK/error)
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import date
from pathlib import Path

# ── Env vars mínimas ──
os.environ.setdefault("APP_SECRET_KEY", "test-x")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://a:b@localhost/test")
os.environ.setdefault("JWT_SECRET_KEY", "test-x")
os.environ.setdefault("FERNET_KEY", "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=")
os.environ.setdefault("VTEX_ACCOUNT", "test-x")
os.environ.setdefault("MARKETPLACE_APP_KEY", "test-x")
os.environ.setdefault("MARKETPLACE_APP_TOKEN", "test-x")
os.environ.setdefault("MARKETPLACE_URL", "https://x.com")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.modules.payway.excel_io import read_payway_keys, InvalidPaywayKeysFile  # noqa: E402
from app.modules.payway.jobs import store  # noqa: E402
from app.modules.payway.service import run_report, validate_credentials  # noqa: E402


AMBIENTE = "produccion"
ESTADO_ID = "0"  # Todos


async def _progress_watcher(job_id: str, stop_evt: asyncio.Event) -> None:
    """Imprime el progreso del job cada 2s hasta que termine."""
    last_units = -1
    while not stop_evt.is_set():
        job = await store.get(job_id)
        if job and job.processed_units != last_units:
            pct = int(job.processed_units / max(1, job.total_units) * 100)
            print(f"  [{pct:3d}%] {job.processed_units:>4} / {job.total_units:<4} unidades  status={job.status}")
            last_units = job.processed_units
        if job and job.status in ("done", "error"):
            return
        try:
            await asyncio.wait_for(stop_evt.wait(), timeout=2.0)
        except asyncio.TimeoutError:
            pass


async def main(xlsx_path: str, date_from_str: str, date_to_str: str) -> int:
    p = Path(xlsx_path)
    if not p.exists():
        print(f"ERROR: archivo no encontrado: {p}")
        return 1

    try:
        df = date.fromisoformat(date_from_str)
        dt = date.fromisoformat(date_to_str)
    except ValueError:
        print("ERROR: fechas deben tener formato YYYY-MM-DD")
        return 1

    print(f"Leyendo credenciales de: {p}")
    try:
        creds = read_payway_keys(p.read_bytes())
    except InvalidPaywayKeysFile as e:
        print(f"ERROR: {e}")
        return 1
    print(f"  -> {len(creds)} credenciales.")

    # Paso 1: validar + descubrir sites
    print("\nValidando credenciales + descubriendo sites...")
    summary = await validate_credentials(creds, ambiente=AMBIENTE)
    print(f"  -> {summary.ok}/{summary.total} OK, {summary.total_sites} sites totales.")

    # Enriquecer credenciales con sites descubiertos
    result_map = {r.username: r for r in summary.results}
    enriched = []
    for c in creds:
        r = result_map.get(c["username"])
        enriched.append({
            "username": c["username"],
            "password": c["password"],
            "sites": [{"idsite": s.idsite, "nombre": s.nombre} for s in (r.sites if r else [])],
        })

    # Paso 2: correr report
    print(f"\nDescargando rango {df} .. {dt} (estado={ESTADO_ID}, ambiente={AMBIENTE})")
    print("  Progreso:")

    job = await store.create(kind="report", user_id="local-test")

    stop_evt = asyncio.Event()
    watcher = asyncio.create_task(_progress_watcher(job.id, stop_evt))
    try:
        await run_report(
            job, enriched, df, dt,
            estado_id=ESTADO_ID, ambiente=AMBIENTE,
        )
    finally:
        stop_evt.set()
        await watcher

    print()
    print("=" * 70)
    print(f"JOB {job.status.upper()}")
    print("=" * 70)
    if job.error_message:
        print(f"  Error: {job.error_message}")
        return 1

    meta = job.meta or {}
    print(f"  Total filas:  {meta.get('total_rows', 0):,}")
    print(f"  Sites OK:     {meta.get('sites_ok', 0)}")
    print(f"  Sites ERROR:  {meta.get('sites_error', 0)}")

    for sr in meta.get("site_results", []):
        marker = "OK " if not sr.get("error") else "ERR"
        err = f"  <- {sr['error']}" if sr.get("error") else ""
        print(
            f"    [{marker}] {sr['username']:<20} {sr['idsite']:<12} "
            f"rows={sr['rows']:>5} days_ok={sr['days_ok']:>2} days_err={sr['days_error']:>2}{err}"
        )

    # Guardar XLSX resultado
    if job.result_xlsx:
        out_dir = Path(__file__).resolve().parent / "_out"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"Payway_Report_{df}_{dt}.xlsx"
        out_path.write_bytes(job.result_xlsx)
        print(f"\n  XLSX guardado en: {out_path}")
        print(f"  Tamaño: {len(job.result_xlsx):,} bytes")

    return 0


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Uso: python scripts/test_payway_report.py <xlsx> <YYYY-MM-DD> <YYYY-MM-DD>")
        sys.exit(1)
    sys.exit(asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3])))
