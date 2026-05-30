"""Hi-Hired Backend - Redis Pub/Sub event publisher."""

from __future__ import annotations


import structlog
from redis import asyncio as aioredis

from src.core.config import get_settings
from src.schemas.events import BaseEvent

logger = structlog.get_logger()

EVENT_CHANNELS: dict[str, str] = {
    "job.ingested": "events:jobs",
    "job.indexed": "events:jobs",
    "user.matched": "events:matching",
    "application.submitted": "events:applications",
    "application.status_changed": "events:applications",
}


class EventPublisher:
    """Publish domain events to Redis Pub/Sub channels."""

    def __init__(self, redis_url: str | None = None) -> None:
        self.redis_url = redis_url or get_settings().redis_url
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
        return self._redis

    async def publish(self, event: BaseEvent) -> bool:
        """Publish an event to its configured Redis channel.

        Returns True if the event was published, False if no channel is configured.
        """
        channel = EVENT_CHANNELS.get(event.event_type)
        if not channel:
            logger.warning("no_channel_for_event", event_type=event.event_type)
            return False
        r = await self._get_redis()
        await r.publish(channel, event.model_dump_json())
        logger.info("event_published", event_type=event.event_type, channel=channel)
        return True

    async def close(self) -> None:
        if self._redis:
            await self._redis.close()
            self._redis = None
