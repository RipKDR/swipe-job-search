from __future__ import annotations

from datetime import datetime
from datetime import timezone as tz
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

utc = tz.utc


class BaseEvent(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(tz=utc))
    correlation_id: UUID
    payload: dict[str, Any]


class JobIngestedEvent(BaseEvent):
    event_type: Literal["job.ingested"] = "job.ingested"


class JobIndexedEvent(BaseEvent):
    event_type: Literal["job.indexed"] = "job.indexed"


class UserMatchedEvent(BaseEvent):
    event_type: Literal["user.matched"] = "user.matched"


class ApplicationSubmittedEvent(BaseEvent):
    event_type: Literal["application.submitted"] = "application.submitted"


class ApplicationStatusChangedEvent(BaseEvent):
    event_type: Literal["application.status_changed"] = "application.status_changed"
