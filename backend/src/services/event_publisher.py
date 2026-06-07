"""Hi-Hired Backend - Event publisher with optional durable outbox.

Supports two delivery modes:

  **Pub/Sub (fast, fire-and-forget):**
     Publish to Redis Pub/Sub for real-time fan-out.  Subscribers must
     handle message loss gracefully.

  **Outbox (durable, at-least-once):**
     Write to the ``event_outbox`` Supabase table inside the caller's
     transaction.  A background worker polls the outbox and delivers
     events via Pub/Sub with retries and dead-lettering.

In production, the typical pattern is:
  1. Emit to the outbox (durable) inside the business-logic transaction.
  2. Optionally also publish via Pub/Sub for immediate real-time subscribers.
"""

from __future__ import annotations

from typing import Any

import structlog
from redis import asyncio as aioredis
from supabase import Client as SupabaseClient

from src.core.config import get_settings
from src.schemas.events import BaseEvent
from src.services.outbox import EventOutbox

logger = structlog.get_logger()

EVENT_CHANNELS: dict[str, str] = {
    "job.ingested": "events:jobs",
    "job.indexed": "events:jobs",
    "user.matched": "events:matching",
    "application.submitted": "events:applications",
    "application.status_changed": "events:applications",
}


class EventPublisher:
    """Publish domain events via Redis Pub/Sub and/or durable outbox."""

    def __init__(
        self,
        redis_url: str | None = None,
        supabase: SupabaseClient | None = None,
    ) -> None:
        self.redis_url = redis_url or get_settings().redis_url
        self._redis: aioredis.Redis | None = None
        self._outbox: EventOutbox | None = EventOutbox(supabase) if supabase else None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
        return self._redis

    async def publish(self, event: BaseEvent) -> bool:
        """Publish an event to its configured Redis Pub/Sub channel.

        Returns True if the event was published, False if no channel is configured.
        Does **not** write to the outbox — use ``emit_durable`` for that.
        """
        channel = EVENT_CHANNELS.get(event.event_type)
        if not channel:
            logger.warning("no_channel_for_event", event_type=event.event_type)
            return False
        r = await self._get_redis()
        await r.publish(channel, event.model_dump_json())
        logger.info("event_published", event_type=event.event_type, channel=channel)
        return True

    async def emit_durable(
        self,
        event: BaseEvent,
    ) -> dict[str, Any]:
        """Write an event to the durable outbox.

        Requires a ``SupabaseClient`` passed at construction time.
        The caller must wrap this call in the same database transaction
        as the triggering business-logic write.

        Raises ``RuntimeError`` if no Supabase client was provided.
        """
        if self._outbox is None:
            raise RuntimeError(
                "emit_durable requires a Supabase client. Pass supabase= to EventPublisher()."
            )
        return await self._outbox.emit(
            event_type=event.event_type,
            correlation_id=event.correlation_id,
            payload=event.payload,
            version=event.version,
        )

    async def close(self) -> None:
        if self._redis:
            await self._redis.close()
            self._redis = None
