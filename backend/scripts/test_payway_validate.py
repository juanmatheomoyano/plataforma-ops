"""
Test local del cliente SAC + validate_credentials() sin backend levantado.

Uso:
    ./venv/Scripts/python.exe scripts/test_payway_validate.py <ruta_al_xlsx>

Ejemplo:
    ./venv/Scripts/python.exe scripts/test_payway_validate.py "C:/Users/juanm/Desktop/PaywayKeys.xlsx"

Ambientes disponibles: produccion | sandbox (variable AMBIENTE abajo)

Requiere estas env vars mínimas (dummy, solo para que Settings() no falle):
    APP_SECRET_KEY=x DATABASE_URL="postgresql+asyncpg://a:b@c/d" JWT_SECRET_KEY=x
    FERNET_KEY="MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=" VTEX_ACCOUNT=x
    MARKETPLACE_APP_KEY=x MARKETPLACE_APP_TOKEN=x MARKETPLACE_URL="https://x.com"

El script no toca la BD ni requiere auth — importa el service directamente.
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# ── Env vars mínimas para importar el proyecto sin arrancar todo el stack ──
os.environ.setdefault("APP_SECRET_KEY", "test-x")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://a:b@localhost/test")
os.environ.setdefault("JWT_SECRET_KEY", "test-x")
os.environ.setdefault("FERNET_KEY", "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=")
os.environ.setdefault("VTEX_ACCOUNT", "test-x")
os.environ.setdefault("MARKETPLACE_APP_KEY", "test-x")
os.environ.setdefault("MARKETPLACE_APP_TOKEN", "test-x")
os.environ.setdefault("MARKETPLACE_URL", "https://x.com")

# El script vive en backend/scripts/, agrego backend/ al path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.modules.payway.excel_io import read_payway_keys, InvalidPaywayKeysFile  # noqa: E402
from app.modules.payway.service import validate_credentials  # noqa: E402


AMBIENTE = "produccion"  # cambiar a "sandbox" para probar contra dev


async def main(xlsx_path: str) -> int:
    p = Path(xlsx_path)
    if not p.exists():
        print(f"ERROR: archivo no encontrado: {p}")
        return 1

    print(f"Leyendo credenciales de: {p}")
    try:
        creds = read_payway_keys(p.read_bytes())
    except InvalidPaywayKeysFile as e:
        print(f"ERROR: {e}")
        return 1

    print(f"-> {len(creds)} credenciales encontradas.")
    print(f"-> ambiente: {AMBIENTE}")
    print()
    print("Validando contra SAC (login + get sites en paralelo)...")
    print()

    summary = await validate_credentials(creds, ambiente=AMBIENTE)

    # Impresión legible
    print("=" * 74)
    print(f"RESULTADO — {summary.ok}/{summary.total} OK · {summary.total_sites} sites totales")
    print("=" * 74)
    for r in summary.results:
        status = "OK   " if r.ok else "ERROR"
        sites_desc = f"{len(r.sites)} site(s)" if r.ok else "-"
        first_site = f"({r.sites[0].nombre[:30]}...)" if r.sites else ""
        err = f"  <- {r.error}" if r.error else ""
        print(f"  [{status}]  {r.username:<25}  {sites_desc:<15} {first_site}{err}")

    print()
    print(f"Total sites: {summary.total_sites}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/test_payway_validate.py <ruta_al_xlsx>")
        sys.exit(1)
    sys.exit(asyncio.run(main(sys.argv[1])))
