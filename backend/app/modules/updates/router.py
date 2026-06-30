import os

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/updates", tags=["updates"])
public_router = APIRouter(tags=["updates"])


@public_router.get("/updates/download", include_in_schema=False)
async def download_page():
    version = os.getenv("APP_VERSION", "1.7.2")
    release_url = os.getenv("RELEASE_URL", "")
    release_date = os.getenv("RELEASE_DATE", "")
    release_notes = os.getenv("RELEASE_NOTES", "")

    date_str = ""
    if release_date:
        try:
            from datetime import datetime
            d = datetime.fromisoformat(release_date.replace("Z", "+00:00"))
            date_str = d.strftime("%d/%m/%Y")
        except Exception:
            date_str = release_date

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Provincia Ops — Descarga</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }}
        .card {{
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 48px 40px;
            max-width: 480px;
            width: 100%;
            text-align: center;
        }}
        .logo-wrap {{
            margin-bottom: 24px;
        }}
        .logo-wrap img {{
            height: 48px;
            width: auto;
        }}
        h1 {{
            font-size: 22px;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 4px;
        }}
        .subtitle {{
            color: #94a3b8;
            font-size: 13px;
            margin-bottom: 32px;
        }}
        .version-badge {{
            display: inline-block;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 12px 20px;
            margin-bottom: 32px;
            text-align: left;
            width: 100%;
        }}
        .version-badge .label {{
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: #64748b;
            margin-bottom: 2px;
        }}
        .version-badge .val {{
            font-size: 14px;
            color: #e2e8f0;
            font-weight: 500;
        }}
        .version-badge .notes {{
            font-size: 12px;
            color: #94a3b8;
            margin-top: 6px;
        }}
        .btn {{
            display: block;
            background: #279D2E;
            color: #fff;
            text-decoration: none;
            font-size: 15px;
            font-weight: 600;
            padding: 14px 24px;
            border-radius: 10px;
            transition: background .15s;
            margin-bottom: 16px;
        }}
        .btn:hover {{ background: #1f7d24; }}
        .note {{
            color: #475569;
            font-size: 12px;
        }}
        .divider {{
            border: none;
            border-top: 1px solid #334155;
            margin: 28px 0;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="logo-wrap">
            <svg width="180" height="40" viewBox="0 0 260 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="40" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#279D2E">Provincia</text>
                <text x="168" y="40" font-family="Arial, sans-serif" font-size="32" font-weight="300" fill="#e2e8f0"> Ops</text>
            </svg>
        </div>
        <h1>Herramienta operativa interna</h1>
        <p class="subtitle">Provincia Compras · Gestión de medios de pago VTEX</p>

        <div class="version-badge">
            <div class="label">Versión disponible</div>
            <div class="val">v{version}{f" — {date_str}" if date_str else ""}</div>
            {f'<div class="notes">{release_notes}</div>' if release_notes else ""}
        </div>

        <a href="{release_url}" class="btn">⬇ &nbsp; Descargar instalador</a>
        <p class="note">Windows 10 / 11 &nbsp;·&nbsp; 64 bits &nbsp;·&nbsp; ~10 MB</p>

        <hr class="divider">
        <p class="note">La aplicación verifica actualizaciones automáticamente al iniciarse.</p>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.get("/latest")
async def get_latest_version():
    version = os.getenv("APP_VERSION", "1.0.0")
    release_url = os.getenv("RELEASE_URL", "")
    pub_date = os.getenv("RELEASE_DATE", "2026-05-25T00:00:00Z")
    notes = os.getenv("RELEASE_NOTES", "Nueva versión disponible")

    return {
        "version": version,
        "notes": notes,
        "pub_date": pub_date,
        "platforms": {
            "windows-x86_64": {
                "url": release_url,
                "signature": "",
            }
        },
    }
