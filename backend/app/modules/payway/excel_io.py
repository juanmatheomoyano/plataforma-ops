"""
Lectura del `PaywayKeys.xlsx` que sube el usuario + generación del XLSX
consolidado con todas las transacciones descargadas.

Formato esperado del xlsx de entrada:
    | usuario   | contraseña |
    |-----------|------------|
    | juan.p    | ***        |
    | maria.g   | ***        |

Formato del xlsx de salida (Consolidado):
    Hoja "Consolidado" con columnas TSV_COLUMNS + "Vencido"
    Estilo: header azul con font blanco, ancho columnas fijo.
"""
from __future__ import annotations

import io
import logging

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


def build_idsites_xlsx(sites_data: list[dict]) -> bytes:
    """
    Genera Payway_IDSITES.xlsx con estado por site
    (mismo formato que el standalone Reporte Transacciones Payway).

    Cada item: {"idsite", "nombre", "username", "password", "error"}
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Listado de IDSites"

    headers = ["IDSITE", "Nombre", "Usuario", "Contraseña", "Estado", "Error"]
    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(bold=True, color="FFFFFF")
    ok_fill = PatternFill("solid", fgColor="E2EFDA")
    err_fill = PatternFill("solid", fgColor="FFDBD9")
    err_font = Font(color="C00000", bold=True)

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

        has_error = bool(item.get("error"))
        row_fill = err_fill if has_error else ok_fill
        estado = "ERROR" if has_error else "OK"

        values = [
            item.get("idsite", ""),
            item.get("nombre", ""),
            item.get("username", ""),
            item.get("password", ""),
            estado,
            item.get("error", ""),
        ]
        for c, val in enumerate(values, 1):
            cell = ws.cell(row=r, column=c, value=val)
            cell.fill = row_fill
            if c in (5, 6) and has_error:
                cell.font = err_font
        r += 1

    col_widths = [14, 35, 20, 18, 10, 60]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
