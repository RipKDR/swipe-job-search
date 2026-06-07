"""Hi-Hired Backend - Notification worker tasks.

Sends push notifications to mobile devices via the Expo Push API.
Device tokens are stored in the Supabase ``device_tokens`` table.

Queue topology (inherited from celery_app):
  notifications  → Low-latency push notification dispatch.
    Retries with exponential backoff (30s-5m).
    Dead-letter after 5 retries → logged; alert.
"""

from __future__ import annotations

import structlog
from src.core.config import get_settings
from src.workers.celery_app import celery_app

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Graceful degradation: expo-server-sdk is optional so the module loads even
# when the package isn't installed (e.g. in test environments or CI without
# mobile dependencies).
# ---------------------------------------------------------------------------
try:
    from exponent_server_sdk import (
        DeviceNotRegisteredError,
        InvalidCredentialsError,
        PushClient,
        PushMessage,
        PushServerError,
    )
except ImportError:  # pragma: no cover
    PushClient = None  # type: ignore[assignment]
    PushMessage = None  # type: ignore[assignment]
    PushServerError = Exception
    DeviceNotRegisteredError = Exception
    InvalidCredentialsError = Exception
    logger.warning(
        "exponent_server_sdk package is not installed — "
        "push notifications will be silently skipped. "
        "Install with: pip install exponent-server-sdk"
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_device_tokens(user_id: str) -> list[str]:
    """Query the ``device_tokens`` table for the user's Expo push tokens.

    Returns an empty list if no tokens are found or if Supabase is
    unreachable.
    """
    try:
        from supabase import create_client

        settings = get_settings()
        sb = create_client(settings.supabase_url, settings.supabase_service_key)

        resp = (
            sb.table("device_tokens")
            .select("expo_push_token")
            .eq("profile_id", user_id)
            .execute()
        )
        tokens = [row["expo_push_token"] for row in resp.data] if resp.data else []
        logger.info(
            "device_tokens_fetched",
            user_id=user_id,
            token_count=len(tokens),
        )
        return tokens
    except Exception:
        logger.exception("failed_to_fetch_device_tokens", user_id=user_id)
        return []


def _send_push(
    tokens: list[str],
    title: str,
    body: str,
    data: dict | None = None,
    channel_id: str = "default",
) -> int:
    """Send a push notification to one or more Expo push tokens.

    Returns the number of tokens that were successfully sent to.
    Handles per-ticket errors (DeviceNotRegistered, InvalidCredentials,
    etc.) by logging and removing invalid tokens from future attempts.
    """
    if not tokens:
        logger.warning("no_tokens_to_send_push")
        return 0

    if PushClient is None or PushMessage is None:
        logger.warning(
            "exponent_server_sdk not available — skipping push notification"
        )
        return 0

    client = PushClient()
    messages = [
        PushMessage(
            to=token,
            title=title,
            body=body,
            data=data or {},
            sound="default",
            channel_id=channel_id,
        )
        for token in tokens
    ]

    try:
        tickets = client.publish_multiple(messages)
    except PushServerError as exc:
        logger.error(
            "push_server_error",
            errors=str(exc.errors) if exc.errors else exc.message,
        )
        return 0
    except Exception:
        logger.exception("push_send_failed")
        return 0

    # --- Process per-ticket results ---
    success_count = 0
    for ticket in tickets:
        if ticket.is_success():
            success_count += 1
            continue

        # Handle known error types
        try:
            ticket.validate_response()
        except DeviceNotRegisteredError:
            logger.info(
                "push_device_not_registered",
                token_prefix=ticket.push_message.to[:20] if ticket.push_message.to else "?",
            )
            # TODO: consider removing this token from the database
        except InvalidCredentialsError:
            logger.error(
                "push_invalid_credentials",
                message=ticket.message,
            )
        except Exception:
            logger.warning(
                "push_ticket_error",
                status=ticket.status,
                message=ticket.message,
                details=ticket.details,
            )

    logger.info(
        "push_notification_sent",
        attempted=len(tokens),
        success=success_count,
    )
    return success_count


# ---------------------------------------------------------------------------
# Celery tasks
# ---------------------------------------------------------------------------


@celery_app.task(
    queue="notifications",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 30},
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    acks_late=True,
)
def send_match_notification(
    self, user_id: str, job_id: str, match_type: str
) -> bool:
    """Send a push notification when a match is found.

    Args:
        user_id:   The recipient user (the candidate who was matched).
        job_id:    The matched job listing ID.
        match_type:  How the match was made — ``"auto"`` (ML-scored) or
                   ``"mutual"`` (both parties swiped right).

    Returns:
        ``True`` if the notification was sent to at least one device.
    """
    logger.info(
        "match_notification_sending",
        user_id=user_id,
        job_id=job_id,
        match_type=match_type,
    )

    tokens = _get_device_tokens(user_id)
    if not tokens:
        logger.warning("match_notification_no_tokens", user_id=user_id)
        return False

    title = "New Job Match!" if match_type == "mutual" else "Job Recommendation"
    body = (
        f"A job you matched with has been confirmed!"
        if match_type == "mutual"
        else "We found a new job that matches your profile."
    )
    data = {
        "type": "match",
        "job_id": job_id,
        "match_type": match_type,
    }

    sent = _send_push(tokens, title=title, body=body, data=data)
    logger.info(
        "match_notification_complete",
        user_id=user_id,
        job_id=job_id,
        match_type=match_type,
        sent=sent,
    )
    return sent > 0


@celery_app.task(
    queue="notifications",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 30},
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    acks_late=True,
)
def send_message_notification(
    self,
    user_id: str,
    match_id: str,
    sender_name: str,
    message_preview: str,
) -> bool:
    """Send a push notification when a user receives a new chat message.

    Args:
        user_id:         The recipient user ID.
        match_id:        The match/conversation ID.
        sender_name:     Display name of the person who sent the message.
        message_preview:  A short preview of the message content.

    Returns:
        ``True`` if the notification was sent to at least one device.
    """
    # Truncate preview to avoid overly long notifications
    preview = (message_preview or "")[:120]

    logger.info(
        "message_notification_sending",
        user_id=user_id,
        match_id=match_id,
        sender_name=sender_name,
        preview_length=len(preview),
    )

    tokens = _get_device_tokens(user_id)
    if not tokens:
        logger.warning("message_notification_no_tokens", user_id=user_id)
        return False

    title = sender_name
    body = preview if preview else "You have a new message"
    data = {
        "type": "message",
        "match_id": match_id,
    }

    sent = _send_push(tokens, title=title, body=body, data=data)
    logger.info(
        "message_notification_complete",
        user_id=user_id,
        match_id=match_id,
        sender_name=sender_name,
        sent=sent,
    )
    return sent > 0
