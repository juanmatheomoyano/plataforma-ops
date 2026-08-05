"""Migración one-time: normaliza sellers.fecha_creacion al formato dd/mm/aaaa.

Uso:
    python -m scripts.normalize_fecha_sellers            # dry-run (imprime, no toca BD)
    python -m scripts.normalize_fecha_sellers --apply    # aplica los cambios

Reporta al final:
    - convertidos: fechas que cambiaron a dd/mm/aaaa
    - ya_normalizados: fechas que ya estaban bien
    - ambiguos: strings A/B/aaaa con ambos <=12 (se dejan intactos para revisar a mano)
    - sin_parsear: strings basura (doble //, letras, etc.) — se dejan intactos
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.modules.sellers.models import Seller
from app.modules.sellers.service import normalize_fecha


def _es_ambiguo(original: str) -> bool:
    """True si es A/B/aaaa con A y B ambos entre 1-12 y aaaa de 4 dígitos."""
    parts = original.split("/")
    if len(parts) != 3 or not all(p.strip().isdigit() for p in parts):
        return False
    a, b, y = (int(p) for p in parts)
    return len(str(y)) == 4 and 1 <= a <= 12 and 1 <= b <= 12


async def main(apply: bool) -> None:
    convertidos = []
    ya_normalizados = []
    ambiguos = []
    sin_parsear = []

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Seller).where(Seller.fecha_creacion.is_not(None)))
        sellers = list(result.scalars().all())

        for s in sellers:
            original = (s.fecha_creacion or "").strip()
            if not original:
                continue
            normalizado = normalize_fecha(original)

            if normalizado == original:
                if _es_ambiguo(original):
                    ambiguos.append((s.seller_id, original))
                elif len(original) == 10 and original[2] == "/" and original[5] == "/":
                    ya_normalizados.append(s.seller_id)
                else:
                    sin_parsear.append((s.seller_id, original))
            else:
                convertidos.append((s.seller_id, original, normalizado))
                if apply:
                    s.fecha_creacion = normalizado

        if apply:
            await db.commit()

    print(f"\n{'=' * 60}")
    print(f"REPORTE — normalize_fecha_sellers ({'APPLY' if apply else 'DRY-RUN'})")
    print(f"{'=' * 60}")
    print(f"Sellers con fecha_creacion no vacía: {len(sellers)}")
    print(f"  Convertidos:      {len(convertidos)}")
    print(f"  Ya normalizados:  {len(ya_normalizados)}")
    print(f"  Ambiguos (skip):  {len(ambiguos)}")
    print(f"  Sin parsear:      {len(sin_parsear)}")

    if convertidos:
        print(f"\n--- Convertidos ({len(convertidos)}) ---")
        for sid, old, new in convertidos[:50]:
            print(f"  {sid}: {old!r} -> {new!r}")
        if len(convertidos) > 50:
            print(f"  ...y {len(convertidos) - 50} más")

    if ambiguos:
        print(f"\n--- Ambiguos — revisar a mano en el módulo Sellers ({len(ambiguos)}) ---")
        for sid, val in ambiguos:
            print(f"  {sid}: {val!r}")

    if sin_parsear:
        print(f"\n--- Sin parsear — revisar a mano ({len(sin_parsear)}) ---")
        for sid, val in sin_parsear:
            print(f"  {sid}: {val!r}")

    if not apply:
        print(f"\n(dry-run) Corré con --apply para persistir los cambios.")
    else:
        print(f"\n✅ Cambios persistidos en la BD.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Persistir cambios en BD (default: dry-run)")
    args = parser.parse_args()
    asyncio.run(main(args.apply))
