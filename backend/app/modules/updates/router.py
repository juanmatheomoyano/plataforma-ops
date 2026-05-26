import os

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/updates", tags=["updates"])


@router.get("/download", include_in_schema=False)
async def download_page():
    version = os.getenv("APP_VERSION", "1.3.0")
    release_url = os.getenv("RELEASE_URL", "")

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Plataforma Operativa — Descarga</title>
        <style>
            body {{ font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0;
                   display: flex; align-items: center; justify-content: center;
                   min-height: 100vh; margin: 0; }}
            .card {{ background: #1e293b; border-radius: 12px; padding: 48px;
                    text-align: center; max-width: 480px; width: 90%; }}
            .logo {{ font-size: 48px; margin-bottom: 16px; }}
            h1 {{ color: #f8fafc; margin-bottom: 8px; font-size: 24px; }}
            .version {{ color: #94a3b8; margin-bottom: 32px; font-size: 14px; }}
            .btn {{ background: #2563eb; color: white; padding: 14px 32px;
                   border-radius: 8px; text-decoration: none; font-size: 16px;
                   font-weight: 600; display: inline-block; }}
            .btn:hover {{ background: #1d4ed8; }}
            .note {{ color: #64748b; font-size: 12px; margin-top: 24px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">🛡️</div>
            <h1>Plataforma Operativa</h1>
            <p class="version">Versión {version} — Provincia NET</p>
            <a href="{release_url}" class="btn">⬇️ Descargar instalador</a>
            <p class="note">Windows 10/11 · 64 bits</p>
        </div>
    </body>
    </html>
    """
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
