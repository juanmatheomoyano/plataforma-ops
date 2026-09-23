"""
Lectura del `PaywayKeys.xlsx` que sube el usuario + generación del ZIP
consolidado con transacciones + logs + XLSX por seller.

Formato esperado del xlsx de entrada:
    | usuario   | contraseña |
    |-----------|------------|
    | juan.p    | ***        |
    | maria.g   | ***        |

Formato del ZIP de salida:
    Payway_Reporte_YYYY-MM-DD_YYYY-MM-DD.zip
    ├── Logs/
    │   └── descarga_YYYYMMDD_HHMMSS.log
    ├── Consolidado.xlsx
    ├── Payway_IDSITES.xlsx
    └── Transacciones/
        ├── Payway_00060644_<seller>.xlsx
        └── ...
"""
from __future__ import annotations

import io
import logging
import re
import zipfile
from datetime import datetime, timezone

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

from .sac_client import TSV_COLUMNS, calc_vencido

logger = logging.getLogger(__name__)


# ─── Parseo del PaywayKeys.xlsx ───────────────────────────────────────────


class InvalidPaywayKeysFile(ValueError):
    """El xlsx subido no tiene el formato esperado."""


def read_payway_keys(data: bytes) -> list[dict]:
    """
    Parsea el xlsx del user. Retorna [{"username": ..., "password": ...}, ...].
    Salta la primera fila (asume header). Ignora filas vacías o parciales.
    """
    try:
        wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except Exception as e:
        raise InvalidPaywayKeysFile(f"No se pudo abrir el archivo: {e}") from e

    ws = wb.active
    creds: list[dict] = []
    first = True
    for row in ws.iter_rows(values_only=True):
        if first:
            first = False
            continue
        if not row or len(row) < 2:
            continue
        u = str(row[0]).strip() if row[0] else ""
        p = str(row[1]).strip() if row[1] else ""
        if u and p and u.lower() != "none" and p.lower() != "none":
            creds.append({"username": u, "password": p})
    wb.close()

    if not creds:
        raise InvalidPaywayKeysFile(
            "El archivo no contiene credenciales válidas. Formato esperado: columna A = usuario, B = contraseña, primera fila = header."
        )
    return creds


# ─── Escritura del XLSX consolidado ───────────────────────────────────────


def build_consolidado_xlsx(rows: list[list[str]], dias_anulacion: int = 90) -> bytes:
    """
    Genera un xlsx en memoria con todas las filas consolidadas.
    Agrega la columna "Vencido" calculada client-side (no viene del SAC).
    Retorna bytes listos para stream-ear al browser.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Consolidado"

    headers = TSV_COLUMNS + ["Vencido"]
    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(bold=True, color="FFFFFF")

    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    for r, row in enumerate(rows, 2):
        for c, val in enumerate(row, 1):
            ws.cell(row=r, column=c, value=val)
        vencido = calc_vencido(row[1] if len(row) > 1 else "", dias_anulacion)
        ws.cell(row=r, column=len(headers), value=vencido)

    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _sanitize_filename(name: str) -> str:
    """Sanitiza para nombre de archivo. Igual que el standalone descargador."""
    return re.sub(r"[^\w\-]", "_", name)[:40]


def build_seller_xlsx(
    rows: list[list[str]],
    idsite: str,
    nombre: str,
    dias_anulacion: int = 90,
) -> bytes:
    """
    Genera un XLSX individual por seller — mismo formato que produce el
    standalone `descargador_sac.py::guardar_excel`. Hoja nombrada con el idsite.

    Retorna bytes listos para meter en el ZIP.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = (idsite or "seller")[:31]

    headers = TSV_COLUMNS + ["Vencido"]
    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(bold=True, color="FFFFFF")

    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    for r, row in enumerate(rows, 2):
        for c, val in enumerate(row, 1):
            ws.cell(row=r, column=c, value=val)
        vencido = calc_vencido(row[1] if len(row) > 1 else "", dias_anulacion)
        ws.cell(row=r, column=len(headers), value=vencido)

    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_idsites_xlsx(sites_data: list[dict]) -> bytes:
    """
    Genera Payway_IDSITES.xlsx con estado por site.

    Cada item: {"idsite", "nombre", "username", "password", "rows", "error"}
        - `rows`: cantidad de transacciones descargadas (int, opcional; default 0)
        - `error`: mensaje de error si algo falló (str vacío si no)

    Estados y colores:
        - ERROR   → rojo · font bordó negrita (si `error` no vacío)
        - VACÍO   → amarillo · font ámbar (si OK pero rows == 0)
        - OK      → verde · muestra cantidad de transacciones (si rows > 0)

    Columnas: IDSITE | Nombre | Usuario | Contraseña | Estado | Transacciones | Error
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Listado de IDSites"

    headers = ["IDSITE", "Nombre", "Usuario", "Contraseña", "Estado", "Transacciones", "Error"]
    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(bold=True, color="FFFFFF")

    ok_fill = PatternFill("solid", fgColor="C6EFCE")       # verde claro
    ok_font = Font(color="006100", bold=True)              # verde oscuro
    empty_fill = PatternFill("solid", fgColor="FFEB9C")    # amarillo
    empty_font = Font(color="9C6500", bold=True)           # ámbar oscuro
    err_fill = PatternFill("solid", fgColor="FFC7CE")      # rojo claro
    err_font = Font(color="9C0006", bold=True)             # bordó

    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    seen: set[tuple[str, str]] = set()
    r = 2
    for item in sites_data:
        key = (item.get("idsite", ""), item.get("username", ""))
        if key in seen:
            continue
        seen.add(key)

        error_msg = (item.get("error") or "").strip()
        rows_count = int(item.get("rows") or 0)

        if error_msg:
            estado = "ERROR"
            row_fill = err_fill
            estado_font = err_font
        elif rows_count == 0:
            estado = "SIN FILAS"
            row_fill = empty_fill
            estado_font = empty_font
        else:
            estado = "OK"
            row_fill = ok_fill
            estado_font = ok_font

        values = [
            item.get("idsite", ""),
            item.get("nombre", ""),
            item.get("username", ""),
            item.get("password", ""),
            estado,
            rows_count,
            error_msg,
        ]
        for c, val in enumerate(values, 1):
            cell = ws.cell(row=r, column=c, value=val)
            cell.fill = row_fill
            # Estado y Transacciones con font de color para reforzar la señal visual
            if c in (5, 6, 7):
                cell.font = estado_font
            if c == 6:
                cell.alignment = Alignment(horizontal="right")
        r += 1

    col_widths = [14, 35, 20, 18, 12, 14, 60]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_report_zip(
    consolidado_rows: list[list[str]],
    per_seller: list[dict],
    sites_data: list[dict],
    log_lines: list[str],
    dias_anulacion: int = 90,
) -> bytes:
    """
    Empaqueta el resultado completo del reporte en un ZIP con estructura:

        Logs/
            descarga_YYYYMMDD_HHMMSS.log
        Consolidado.xlsx
        Payway_IDSITES.xlsx
        Transacciones/
            Payway_{idsite}_{seller_sanitized}.xlsx

    `per_seller` es una lista de dicts:
        {"username": str, "idsite": str, "nombre": str, "rows": [[...], ...]}

    Si un seller no tiene filas descargadas, se omite del ZIP (no genera
    XLSX vacío) — el estado queda reflejado en `Payway_IDSITES.xlsx`.
    """
    buf = io.BytesIO()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # Log de la corrida — texto plano UTF-8
        zf.writestr(f"Logs/descarga_{stamp}.log", "\n".join(log_lines).encode("utf-8"))

        # Consolidado global
        zf.writestr("Consolidado.xlsx", build_consolidado_xlsx(consolidado_rows, dias_anulacion))

        # Índice de sites (estado por credencial)
        zf.writestr("Payway_IDSITES.xlsx", build_idsites_xlsx(sites_data))

        # Un XLSX por seller (solo los que tienen filas)
        used_names: set[str] = set()
        for entry in per_seller:
            rows = entry.get("rows") or []
            if not rows:
                continue
            idsite = entry.get("idsite", "unknown")
            nombre = entry.get("nombre", "")
            safe = _sanitize_filename(nombre) if nombre else "seller"
            base = f"Payway_{idsite}_{safe}.xlsx"
            # Evitar colisiones (varios sellers con nombres muy parecidos truncados)
            fname = base
            n = 1
            while fname in used_names:
                n += 1
                fname = f"Payway_{idsite}_{safe}_{n}.xlsx"
            used_names.add(fname)
            zf.writestr(
                f"Transacciones/{fname}",
                build_seller_xlsx(rows, idsite, nombre, dias_anulacion),
            )

    return buf.getvalue()
