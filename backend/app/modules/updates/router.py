import os

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/updates", tags=["updates"])
public_router = APIRouter(tags=["updates"])


@public_router.get("/updates/download", include_in_schema=False)
async def download_page():
    info = _load_release_info()
    version = info.get("version") or os.getenv("APP_VERSION", "1.7.2")
    release_date = info.get("pub_date") or os.getenv("RELEASE_DATE", "")
    release_notes = info.get("notes") or os.getenv("RELEASE_NOTES", "")
    if info:
        release_url = (
            f"https://github.com/juanmatheomoyano/plataforma-ops/releases/download/"
            f"v{version}/Provincia-Ops_{version}_x64-setup.exe"
        )
    else:
        release_url = os.getenv("RELEASE_URL", "")

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
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

        body {{
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            background: #F6F9FB;
            color: #0B2230;
            min-height: 100vh;
            display: flex;
        }}

        /* ── Layout split ── */
        .hero {{
            position: relative;
            flex: 1;
            min-height: 220px;
            background: #0B2230;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }}
        .hero-gradient {{
            position: absolute;
            inset: 0;
            background:
                radial-gradient(circle at 20% 20%, rgba(10,160,220,0.30), transparent 55%),
                radial-gradient(circle at 85% 75%, rgba(38,181,84,0.22), transparent 55%);
        }}
        .hero-grid {{
            position: absolute;
            inset: 0;
            opacity: 0.06;
            background-image:
                linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px);
            background-size: 44px 44px;
            -webkit-mask-image: radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%);
            mask-image: radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%);
        }}
        .hero-content {{
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 56px 48px;
        }}

        .panel {{
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px 40px;
        }}
        .panel-inner {{
            width: 100%;
            max-width: 400px;
        }}

        /* ── Logo ── */
        .logo {{
            display: inline-flex;
            align-items: center;
            gap: 14px;
            text-decoration: none;
        }}
        .logo-wordmark {{
            display: flex;
            flex-direction: column;
            line-height: 1;
        }}
        .logo-name {{
            font-size: 30px;
            font-weight: 800;
            letter-spacing: -0.035em;
            color: #F6F9FB;
        }}
        .logo-name span {{ color: #3EC0F0; }}

        /* ── Panel typography ── */
        .panel h1 {{
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: #0B2230;
            margin-bottom: 4px;
        }}
        .panel .sub {{
            font-size: 13px;
            color: #5B7383;
            margin-bottom: 32px;
        }}

        /* ── Version badge ── */
        .badge {{
            background: #fff;
            border: 1px solid #E4EBF1;
            border-radius: 10px;
            padding: 14px 18px;
            margin-bottom: 28px;
            box-shadow: 0 1px 2px rgba(11,34,48,0.04), 0 12px 32px -18px rgba(11,34,48,0.10);
        }}
        .badge-label {{
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #5B7383;
            margin-bottom: 4px;
        }}
        .badge-version {{
            font-size: 15px;
            font-weight: 700;
            color: #0B2230;
        }}
        .badge-notes {{
            font-size: 12px;
            color: #5B7383;
            margin-top: 6px;
            line-height: 1.5;
        }}

        /* ── Button ── */
        .btn {{
            display: block;
            background: #0B2230;
            color: #fff;
            text-decoration: none;
            font-size: 14px;
            font-weight: 700;
            padding: 13px 24px;
            border-radius: 10px;
            text-align: center;
            transition: background 0.15s, box-shadow 0.15s;
            margin-bottom: 12px;
            position: relative;
            overflow: hidden;
        }}
        .btn::after {{
            content: '';
            position: absolute;
            left: 16px; right: 16px; bottom: -10px;
            height: 20px;
            border-radius: 50%;
            background: rgba(10,160,220,0.50);
            filter: blur(14px);
            opacity: 0.7;
        }}
        .btn:hover {{ background: #142C3D; }}

        /* ── Footer notes ── */
        .note {{
            font-size: 11.5px;
            color: #5B7383;
            text-align: center;
        }}
        .divider {{
            border: none;
            border-top: 1px solid #E4EBF1;
            margin: 24px 0;
        }}
        .eyebrow {{
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #5B7383;
        }}

        /* ── Responsive ── */
        @media (max-width: 768px) {{
            body {{ flex-direction: column; }}
            .hero {{ min-height: 180px; }}
            .hero-content {{ padding: 36px 28px; }}
            .logo-name {{ font-size: 24px; }}
            .panel {{ padding: 36px 24px; }}
        }}
    </style>
</head>
<body>

    <!-- Hero izquierdo -->
    <section class="hero">
        <div class="hero-gradient"></div>
        <div class="hero-grid"></div>
        <div class="hero-content">
            <div class="logo">
                <!-- Escudo PO -->
                <svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" aria-label="Provincia Ops">
                    <defs>
                        <linearGradient id="po-g" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#26B554"/>
                            <stop offset="100%" stop-color="#1F9E48"/>
                        </linearGradient>
                    </defs>
                    <rect x="1" y="1" width="50" height="50" rx="14" fill="url(#po-g)"/>
                    <rect x="1" y="1" width="50" height="50" rx="14" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
                    <text x="50%" y="50%" dy="0.06em" text-anchor="middle" dominant-baseline="central"
                          fill="#fff" font-family="'Plus Jakarta Sans',system-ui,sans-serif"
                          font-weight="800" font-size="18" letter-spacing="-1">PO</text>
                </svg>
                <div class="logo-wordmark">
                    <span class="logo-name">Provincia<span> Ops</span></span>
                </div>
            </div>
        </div>
    </section>

    <!-- Panel derecho -->
    <section class="panel">
        <div class="panel-inner">
            <p class="eyebrow" style="margin-bottom:10px;">Herramienta operativa interna</p>
            <h1>Descargá el instalador</h1>
            <p class="sub">Gestión de medios de pago VTEX · Windows 10/11 64 bits</p>

            <div class="badge">
                <div class="badge-label">Versión disponible</div>
                <div class="badge-version">v{version}{f" &nbsp;·&nbsp; {date_str}" if date_str else ""}</div>
                {f'<div class="badge-notes">{release_notes}</div>' if release_notes else ""}
            </div>

            <a href="{release_url}" class="btn">Descargar instalador &nbsp;↓</a>
            <p class="note">~10 MB · Se instala sin intervención del administrador</p>

            <hr class="divider">
            <p class="note">La aplicación verifica actualizaciones automáticamente al iniciarse.</p>
        </div>
    </section>

</body>
</html>"""
    return HTMLResponse(content=html)


def _load_release_info() -> dict:
    """
    Lee release_info.json (generado por el workflow de GitHub Actions).
    Si no existe, cae a las env vars legacy para compatibilidad.
    """
    info_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "release_info.json")
    info_path = os.path.normpath(info_path)
    try:
        if os.path.exists(info_path):
            import json
            with open(info_path, encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


@router.get("/latest")
async def get_latest_version():
    info = _load_release_info()

    version = info.get("version") or os.getenv("APP_VERSION", "1.0.0")
    pub_date = info.get("pub_date") or os.getenv("RELEASE_DATE", "2026-05-25T00:00:00Z")
    notes = info.get("notes") or os.getenv("RELEASE_NOTES", "Nueva versión disponible")
    signature = info.get("signature") or os.getenv("RELEASE_SIGNATURE", "")

    # Si hay release_info.json, construye la URL desde la versión del archivo.
    # RELEASE_URL env var solo se usa cuando el archivo no existe (legacy fallback).
    if info:
        release_url = (
            f"https://github.com/juanmatheomoyano/plataforma-ops/releases/download/"
            f"v{version}/Provincia-Ops_{version}_x64-setup.exe"
        )
    else:
        release_url = os.getenv("RELEASE_URL", "")

    return {
        "version": version,
        "notes": notes,
        "pub_date": pub_date,
        "platforms": {
            "windows-x86_64": {
                "url": release_url,
                "signature": signature,
            }
        },
    }
