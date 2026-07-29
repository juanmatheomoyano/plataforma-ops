"""Tests del context manager job_lock y del gate del sync marketplace."""
import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.core.scheduler import job_lock


@pytest.mark.asyncio
async def test_job_lock_yields_true_when_acquired():
    """Si try_acquire devuelve True, el context yield-ea True y llama release."""
    db = AsyncMock()
    with patch("app.core.scheduler.try_acquire_lock", AsyncMock(return_value=True)) as acq, \
         patch("app.core.scheduler.release_lock", AsyncMock()) as rel:
        async with job_lock(db, "test_job", 60) as acquired:
            assert acquired is True
        acq.assert_awaited_once_with(db, "test_job", 60)
        rel.assert_awaited_once_with(db, "test_job")


@pytest.mark.asyncio
async def test_job_lock_yields_false_when_not_acquired():
    """Si try_acquire devuelve False, yield-ea False y NO llama release."""
    db = AsyncMock()
    with patch("app.core.scheduler.try_acquire_lock", AsyncMock(return_value=False)) as acq, \
         patch("app.core.scheduler.release_lock", AsyncMock()) as rel:
        async with job_lock(db, "test_job", 60) as acquired:
            assert acquired is False
        acq.assert_awaited_once()
        rel.assert_not_awaited()


@pytest.mark.asyncio
async def test_job_lock_releases_on_exception():
    """Si el bloque lanza excepción, el lock debe liberarse igual."""
    db = AsyncMock()
    with patch("app.core.scheduler.try_acquire_lock", AsyncMock(return_value=True)), \
         patch("app.core.scheduler.release_lock", AsyncMock()) as rel:
        with pytest.raises(RuntimeError):
            async with job_lock(db, "test_job", 60):
                raise RuntimeError("boom")
        rel.assert_awaited_once()


@pytest.mark.asyncio
async def test_marketplace_sync_skips_if_lock_taken():
    """Si otra réplica tiene el lock, _run_marketplace_sync NO llama al sync real."""
    from app import main as main_module

    with patch("app.main.job_lock") as jl_patch, \
         patch("app.main.sync_marketplace_sellers", AsyncMock()) as sync_patch, \
         patch("app.main.AsyncSessionLocal") as _:

        class FakeCtx:
            async def __aenter__(self_inner): return False
            async def __aexit__(self_inner, *a): return None
        jl_patch.return_value = FakeCtx()

        # Mock AsyncSessionLocal context
        class FakeDbCtx:
            async def __aenter__(self_inner): return AsyncMock()
            async def __aexit__(self_inner, *a): return None
        main_module.AsyncSessionLocal.return_value = FakeDbCtx()

        await main_module._run_marketplace_sync("test")
        sync_patch.assert_not_awaited()
