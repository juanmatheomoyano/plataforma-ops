import os

from fastapi import APIRouter

router = APIRouter(prefix="/updates", tags=["updates"])


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
