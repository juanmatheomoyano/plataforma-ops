"""
Job store in-memory para trabajos Payway (reportes y rotaciones).

Diseño intencional simple:
    - Dict global protegido con Lock. Cada job vive durante su ejecución
      + un TTL corto (30 min) para que el user pueda descargar el resultado.
    - NO usamos Postgres para el estado. Un job se pierde si el pod
      reinicia — es aceptable porque el user puede reintentar.
    - El XLSX generado también vive acá (bytes en memoria). Con ~1000
      transacciones por seller × 60 sellers = ~10-20 MB. Cabe.

Este store solo funciona con 1 worker uvicorn. Si algún día escalamos a
múltiples réplicas hay que migrar a Redis o BD. Por ahora Railway corre
1 instancia y el modelo alcanza.
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Literal

logger = logging.getLogger(__name__)

_TTL_SECONDS = 30 * 60  # 30 min para descargar el resultado

JobStatus = Literal["pending", "running", "done", "error", "cancelled"]


@dataclass
class Job:
    id: str
    kind: str  # "report" | "rotation"
    user_id: str  # quien lo lanzó
    status: JobStatus = "pending"
    processed_units: int = 0
    total_units: int = 0
    created_at: float = field(default_factory=time.time)
    started_at: float | None = None
    finished_at: float | None = None
    error_message: str | None = None
    # Bytes del XLSX consolidado (para reports). None hasta que status=done.
    result_xlsx: bytes | None = None
    # Info extra que el frontend renderiza en la pantalla de resultados
    meta: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        # Nunca exponemos result_xlsx en el polling — solo tamaño.
        return {
            "id": self.id,
            "kind": self.kind,
            "status": self.status,
            "processed_units": self.processed_units,
            "total_units": self.total_units,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "error_message": self.error_message,
            "has_result": self.result_xlsx is not None,
            "result_size_bytes": len(self.result_xlsx) if self.result_xlsx else 0,
            "meta": self.meta,
        }


class JobStore:
    def __init__(self):
        self._jobs: dict[str, Job] = {}
        self._lock = asyncio.Lock()

    async def create(self, kind: str, user_id: str) -> Job:
        job = Job(id=str(uuid.uuid4()), kind=kind, user_id=user_id)
        async with self._lock:
            self._purge_expired_locked()
            self._jobs[job.id] = job
        return job

    async def get(self, job_id: str) -> Job | None:
        async with self._lock:
            self._purge_expired_locked()
            return self._jobs.get(job_id)

    async def update(self, job: Job) -> None:
        async with self._lock:
            self._jobs[job.id] = job

    def _purge_expired_locked(self) -> None:
        """Elimina jobs terminados hace > TTL_SECONDS. Requiere lock ya tomado."""
        now = time.time()
        to_delete = [
            jid for jid, j in self._jobs.items()
            if j.finished_at is not None and (now - j.finished_at) > _TTL_SECONDS
        ]
        for jid in to_delete:
            logger.debug("payway.jobs purged expired job=%s", jid)
            del self._jobs[jid]


# Singleton global — 1 instancia por proceso uvicorn.
store = JobStore()
