"""
Inyecta env vars mínimas para que Settings() no falle en tests unitarios.
Debe ejecutarse antes de cualquier import del proyecto.
"""
import os

os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-for-tests-only")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")
os.environ.setdefault("FERNET_KEY", "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=")
os.environ.setdefault("VTEX_ACCOUNT", "test-account")
