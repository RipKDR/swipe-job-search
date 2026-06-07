"""Hi-Hired Backend - Durable outbox for event emission.

Provides an outbox table (via Supabase) that guarantees at-least-once
event delivery.  The flow:

  1. A service writes an event row to the ``event_outbox`` table inside
     the same database transaction as the business-logic write.
  2. A background worker (Celery beat or lightweight poller) reads
     unprocessed outbox rows, publishes them via ``EventPublisher``,
     and marks them as delivered.

This pattern avoids dual-write inconsistencies (service writes business
data but event publish fails) and enables replay/backfill — any consumer
that falls behind can catch up by reprocessing outbox rows.

Usage:

    outbox = EventOutbox(supabase)
    await outbox.emit(
        event_type="job.ingested",
        correlation_id=some_uuid,
        payload={"raw_job_input": raw_input.model_dump()},
    )
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone as tz
from typing import Any

import structlog
from supabase import Client as SupabaseClient


logger = structlog.get_logger()

utc = tz.utc

OUTBOX_TABLE = "event_outbox"
DEFAULT_BATCH_SIZE = 50
DEFAULT_POLL_INTERVAL_S = 5


class EventOutbox:
    """Durable event outbox backed by Supabase.

    Thread-safe for the Supabase client; callers should share one
    ``EventOutbox`` instance per process.
    """

    def __init__(self, supabase: SupabaseClient, batch_size: int = DEFAULT_BATCH_SIZE) -> None:
        self._supabase = supabase
        self._batch_size = batch_size

    # ── producer API ─────────────────────────────────────────────────────

    async def emit(
        self,
        event_type: str,
        correlation_id: str | uuid.UUID,
        payload: dict[str, Any],
        version: int = 1,
    ) -> dict[str, Any]:
        """Write an event to the outbox table.

        Returns the inserted row as a dict.

        The caller is responsible for wrapping this call in the same
        transaction as the triggering business-logic write.
        """
        row = {
            "id": str(uuid.uuid4()),
            "event_type": event_type,
            "version": version,
            "correlation_id": str(correlation_id),
            "payload": payload,
            "status": "pending",
            "created_at": datetime.now(utc).isoformat(),
            "delivered_at": None,
            "retry_count": 0,
            "last_error": None,
        }

        result = self._supabase.table(OUTBOX_TABLE).insert(row).execute()
        if result.error:
            logger.error("outbox_insert_failed", event_type=event_type, error=str(result.error))
            raise RuntimeError(f"Failed to insert outbox row: {result.error}")

        logger.debug("outbox_emitted", event_type=event_type, correlation_id=str(correlation_id))
        return row

    # ── consumer/poller API ──────────────────────────────────────────────

    def fetch_pending(self, limit: int | None = None) -> list[dict[str, Any]]:
        """Fetch pending (undelivered) outbox rows, oldest first.

        Returns up to ``self._batch_size`` rows (or ``limit`` if given).
        """
        limit = limit or self._batch_size
        result = (
            self._supabase.table(OUTBOX_TABLE)
            .select("*")
            .eq("status", "pending")
            .order("created_at")
            .limit(limit)
            .execute()
        )

        if result.error:
            logger.error("outbox_fetch_failed", error=str(result.error))
            return []

        return result.data or []

    def mark_delivered(self, row_id: str) -> None:
        """Mark a single outbox row as delivered."""
        result = (
            self._supabase.table(OUTBOX_TABLE)
            .update(
                {
                    "status": "delivered",
                    "delivered_at": datetime.now(utc).isoformat(),
                }
            )
            .eq("id", row_id)
            .eq("status", "pending")
            .execute()
        )

        if result.error:
            logger.error("outbox_mark_delivered_failed", row_id=row_id, error=str(result.error))

    def mark_failed(self, row_id: str, error_message: str) -> None:
        """Increment retry count and log the error.

        After N failures, a separate dead-letter monitor can escalate.
        """
        result = (
            self._supabase.table(OUTBOX_TABLE)
            .update(
                {
                    "retry_count": self._supabase.rpc("increment_int", {"col": "retry_count"}),
                    "last_error": error_message[:500],
                    "status": "pending",
                }
            )
            .eq("id", row_id)
            .execute()
        )

        if result.error:
            logger.error("outbox_mark_failed_error", row_id=row_id, error=str(result.error))

        logger.warning("outbox_delivery_failed", row_id=row_id, error=error_message)

    # ── replay / backfill ────────────────────────────────────────────────

    def fetch_failed(self, max_retries: int = 5, limit: int | None = None) -> list[dict[str, Any]]:
        """Fetch rows that have exceeded max_retries for dead-letter review.

        Returns up to ``self._batch_size`` rows.
        """
        limit = limit or self._batch_size
        result = (
            self._supabase.table(OUTBOX_TABLE)
            .select("*")
            .eq("status", "pending")
            .gte("retry_count", max_retries)
            .order("created_at")
            .limit(limit)
            .execute()
        )

        return result.data or []

    def backfill(
        self, event_type_filter: str | None = None, limit: int = 200
    ) -> list[dict[str, Any]]:
        """Re-deliver past events by resetting their status to 'pending'.

        Useful when a downstream consumer needs to catch up after an outage.
        """
        query = (
            self._supabase.table(OUTBOX_TABLE)
            .update({"status": "pending", "retry_count": 0, "last_error": None})
            .eq("status", "delivered")
        )

        if event_type_filter:
            query = query.eq("event_type", event_type_filter)

        result = query.limit(limit).execute()

        if result.error:
            logger.error("outbox_backfill_failed", error=str(result.error))
            return []

        updated = result.data or []
        logger.info("outbox_backfilled", count=len(updated), event_type=event_type_filter)
        return updated
