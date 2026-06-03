"""Hi-Hired Backend - Redis Pub/Sub event subscriber."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

import structlog
from redis import asyncio as aioredis

from src.core.config import get_settings

logger = structlog.get_logger()

EventHandler = Callable[[dict[str, Any]], Awaitable[None]]


class EventSubscriber:
    """Subscribe to Redis Pub/Sub channels and dispatch events to handlers."""

    def __init__(self, redis_url: str | None = None) -> None:
        self.redis_url = redis_url or get_settings().redis_url
        self._handlers: dict[str, list[EventHandler]] = {}
        self._running = False

    async def subscribe(self, channel: str, handler: EventHandler) -> None:
        """Register a handler for a given Redis channel."""
        self._handlers.setdefault(channel, []).append(handler)

    async def start(self) -> None:
        """Start listening for events on all subscribed channels."""
        self._running = True
        while self._running:
            try:
                r = aioredis.from_url(self.redis_url, decode_responses=True)
                ps = r.pubsub()
                await ps.subscribe(*self._handlers.keys())
                async for msg in ps.listen():
                    if msg["type"] == "message":
                        await self._dispatch(msg["channel"], msg["data"])
            except Exception:
                import asyncio

                logger.exception("subscriber_loop_error, retrying in 5s")
                await asyncio.sleep(5)

    async def _dispatch(self, channel: str, data: str) -> None:
        """Dispatch a raw message to all registered handlers for the channel."""
        try:
            payload = json.loads(data)
        except json.JSONDecodeError:
            logger.error("invalid_event_json", channel=channel)
            return

        for handler in self._handlers.get(channel, []):
            try:
                await handler(payload)
            except Exception as e:
                logger.error("handler_failed", channel=channel, error=str(e), exc_info=True)

    async def stop(self) -> None:
        """Stop the subscriber loop."""
        self._running = False

    async def close(self) -> None:
        """Clean up resources."""
        await self.stop()
