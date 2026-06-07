"""Hi-Hired Backend - Qdrant vector store for job embeddings and similarity search."""

from __future__ import annotations

from typing import Any
from uuid import UUID

import structlog
from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from qdrant_client.http.models import (
    Distance,
    PayloadSchemaType,
    PointStruct,
    UpdateStatus,
    VectorParams,
)

from src.core.config import get_settings
from src.schemas.jobs import NormalizedJob

logger = structlog.get_logger()

COLLECTION_NAME = "hi_hired_jobs"
VECTOR_SIZE = 1536
COLLECTION_VERSION = 1  # bump on breaking payload schema change

# Payload keys stored on each point
_PAYLOAD_KEYS = {
    "job_id",
    "title",
    "company_name",
    "employment_type",
    "location_state",
    "salary_min",
    "salary_max",
    "description",
    "source_name",
    "posted_at",
    "is_active",
    "_version",
}


def _normalize_filters(filters: dict[str, Any] | None) -> qdrant_models.Filter | None:
    """Build a Qdrant Filter from a dict of human-friendly filter keys.

    Supported keys:
        - ``employment_type`` (str, exact match)
        - ``location_state`` (str, exact match)
        - ``salary_min`` (float, gte match)
    """
    if not filters:
        return None

    must_conditions: list[qdrant_models.FieldCondition | qdrant_models.Range] = []

    for key, value in filters.items():
        if key == "employment_type" and isinstance(value, str):
            must_conditions.append(
                qdrant_models.FieldCondition(
                    key="employment_type",
                    match=qdrant_models.MatchValue(value=value),
                )
            )
        elif key == "location_state" and isinstance(value, str):
            must_conditions.append(
                qdrant_models.FieldCondition(
                    key="location_state",
                    match=qdrant_models.MatchValue(value=value.upper()),
                )
            )
        elif key == "salary_min" and isinstance(value, (int, float)):
            must_conditions.append(
                qdrant_models.FieldCondition(
                    key="salary_min",
                    range=qdrant_models.Range(gte=float(value)),
                )
            )
        else:
            logger.warning("unrecognised_filter_key", key=key, value=value)

    if not must_conditions:
        return None

    return qdrant_models.Filter(must=must_conditions)


def _job_to_payload(job: NormalizedJob) -> dict[str, Any]:
    """Convert a ``NormalizedJob`` to a flat payload dict for Qdrant."""
    return {
        "job_id": str(job.id),
        "title": job.title,
        "company_name": job.company_name,
        "employment_type": job.employment_type.value,
        "location_state": job.location.state,
        "salary_min": job.salary.min if job.salary else None,
        "salary_max": job.salary.max if job.salary else None,
        "description": job.description[:1000] if job.description else "",
        "source_name": job.source_name,
        "posted_at": job.posted_at.isoformat(),
        "is_active": job.is_active,
        "_version": COLLECTION_VERSION,
    }


class VectorStore:
    """Qdrant-backed vector store for job embedding search.

    Usage
    -----
    **Production** (URL + optional API key)::

        store = VectorStore(url="http://qdrant:6333", api_key="...")

    **Tests** (in-memory, no server needed)::

        store = VectorStore(url=":memory:")

    The store auto-creates the ``hi_hired_jobs`` collection (1536-d cosine)
    with payload indexes on ``employment_type``, ``location_state``,
    ``salary_min``, and ``salary_max`` on first connection.
    """

    def __init__(
        self,
        url: str | None = None,
        api_key: str | None = None,
        collection: str = COLLECTION_NAME,
    ) -> None:
        self.collection = collection
        self._resolved_url = url
        self._api_key = api_key

        settings = get_settings()
        url = url or settings.qdrant_url
        api_key = api_key or settings.qdrant_api_key
        collection = collection or settings.qdrant_collection

        self.collection = collection

        if url == ":memory:":
            self._client = QdrantClient(location=":memory:")
            logger.info("vector_store_initialised", mode="memory")
        else:
            self._client = QdrantClient(
                url=url,
                api_key=api_key or None,
            )
            logger.info("vector_store_initialised", mode="remote", url=url)

        self._ensure_collection()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_collection(self) -> None:
        """Create the collection with payload indexes if it does not exist."""
        if self._client.collection_exists(self.collection):
            logger.debug("collection_already_exists", collection=self.collection)
            return

        self._client.create_collection(
            collection_name=self.collection,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )

        # Payload indexes for filtered search
        self._client.create_payload_index(
            collection_name=self.collection,
            field_name="employment_type",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        self._client.create_payload_index(
            collection_name=self.collection,
            field_name="location_state",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        self._client.create_payload_index(
            collection_name=self.collection,
            field_name="salary_min",
            field_schema=PayloadSchemaType.FLOAT,
        )
        self._client.create_payload_index(
            collection_name=self.collection,
            field_name="salary_max",
            field_schema=PayloadSchemaType.FLOAT,
        )

        logger.info("collection_created", collection=self.collection, size=VECTOR_SIZE)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def index_job(self, job: NormalizedJob, embedding: list[float]) -> bool:
        """Index a job into the vector store.

        Parameters
        ----------
        job:
            The normalised job to store.
        embedding:
            Dense vector embedding of the job (must be 1536-dimensional).

        Returns
        -------
        ``True`` on success.
        """
        point = PointStruct(
            id=str(job.id),
            vector=embedding,
            payload=_job_to_payload(job),
        )
        self._client.upsert(collection_name=self.collection, points=[point])
        logger.info("job_indexed", job_id=str(job.id))
        return True

    def search_similar(
        self,
        query_embedding: list[float],
        filters: dict[str, Any] | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Search for jobs by embedding similarity.

        Parameters
        ----------
        query_embedding:
            Query vector (1536-d).
        filters:
            Optional dict of filters. See ``_normalize_filters``.
        limit:
            Maximum number of results (default 20).

        Returns
        -------
        List of payload dicts ordered by descending similarity, each augmented
        with a ``_score`` key holding the cosine similarity.
        """
        qdrant_filter = _normalize_filters(filters)

        response = self._client.query_points(
            collection_name=self.collection,
            query=query_embedding,
            query_filter=qdrant_filter,
            limit=limit,
        )

        results: list[dict[str, Any]] = []
        for point in response.points:
            if point.payload:
                payload = dict(point.payload)
                payload["_score"] = point.score
                results.append(payload)

        logger.info(
            "search_completed",
            result_count=len(results),
            filters_applied=bool(filters),
        )
        return results

    def delete_job(self, job_id: UUID) -> bool:
        """Delete a job point from the vector store by its UUID.

        Returns ``True`` if at least one point was removed.
        """
        str_id = str(job_id)
        result = self._client.delete(
            collection_name=self.collection,
            points_selector=qdrant_models.Filter(
                must=[
                    qdrant_models.FieldCondition(
                        key="job_id",
                        match=qdrant_models.MatchValue(value=str_id),
                    )
                ]
            ),
        )
        deleted = result.status == UpdateStatus.COMPLETED or result.status == "completed"
        logger.info("job_deleted", job_id=str_id, status=str(result.status))
        return True if deleted else bool(result.status)

    # ------------------------------------------------------------------
    # Cache coherence helpers
    # ------------------------------------------------------------------

    def get_versions_for_cache_invalidation(self) -> list[dict[str, Any]]:
        """Return all indexed job IDs with their version and updated_at.

        Callers can compare this with cached data to determine which
        cached entries are stale.  Useful for selective cache invalidation
        rather than flushing the entire cache.
        """
        try:
            scroll_result = self._client.scroll(
                collection_name=self.collection,
                limit=10000,
                with_payload=["job_id", "_version", "posted_at"],
                with_vectors=False,
            )
        except Exception:
            logger.exception("get_versions_for_cache_invalidation_failed")
            return []

        versions: list[dict[str, Any]] = []
        for point in scroll_result[0]:
            if point.payload:
                versions.append(
                    {
                        "job_id": point.payload.get("job_id"),
                        "_version": point.payload.get("_version"),
                        "posted_at": point.payload.get("posted_at"),
                    }
                )
        return versions

    def reindex_all(self, jobs: list[NormalizedJob], embeddings: list[list[float]]) -> int:
        """Delete all points and reindex a batch of jobs.

        Useful for full reindex after a payload schema version bump.
        Jobs and embeddings must be aligned lists (same length, same order).

        Returns the number of points indexed.
        """
        if len(jobs) != len(embeddings):
            raise ValueError(
                f"jobs ({len(jobs)}) and embeddings ({len(embeddings)}) must be same length"
            )

        # Delete all existing points
        self._client.delete(
            collection_name=self.collection,
            points_selector=qdrant_models.Filter(
                must=[
                    qdrant_models.FieldCondition(
                        key="_version",
                        match=qdrant_models.MatchValue(value=COLLECTION_VERSION),
                    )
                ]
            ),
        )

        # Reindex fresh
        points = [
            PointStruct(
                id=str(job.id),
                vector=embedding,
                payload=_job_to_payload(job),
            )
            for job, embedding in zip(jobs, embeddings, strict=False)
        ]

        if points:
            self._client.upsert(collection_name=self.collection, points=points)

        logger.info("reindex_complete", count=len(points), collection=self.collection)
        return len(points)

    def count_stale_points(self) -> int:
        """Count points with a ``_version`` that does not match ``COLLECTION_VERSION``.

        Returns 0 if all points are at the current version.
        Useful for monitoring drift after schema changes.
        """
        try:
            total = self._client.count(collection_name=self.collection, exact=True).count
            current = self._client.count(
                collection_name=self.collection,
                exact=True,
                count_filter=qdrant_models.Filter(
                    must=[
                        qdrant_models.FieldCondition(
                            key="_version",
                            match=qdrant_models.MatchValue(value=COLLECTION_VERSION),
                        )
                    ]
                ),
            ).count
            return total - current
        except Exception:
            logger.exception("count_stale_points_failed")
            return -1

    def health(self) -> dict[str, Any]:
        """Return a health-check dict for the vector store.

        Keys
        ----
        - ``status`` — ``"ok"`` if Qdrant is reachable, ``"error"`` otherwise.
        - ``collection`` — collection name.
        - ``points_count`` — number of indexed points (or ``-1`` on error).
        - ``mode`` — ``"memory"`` or ``"remote"``.
        - ``error`` — error message if applicable.
        """
        try:
            self._client.get_collection(collection_name=self.collection)
            count_result = self._client.count(
                collection_name=self.collection,
                exact=True,
            )
            return {
                "status": "ok",
                "collection": self.collection,
                "points_count": count_result.count,
                "mode": "memory" if self._resolved_url == ":memory:" else "remote",
            }
        except Exception as exc:
            logger.exception("health_check_failed")
            return {
                "status": "error",
                "collection": self.collection,
                "points_count": -1,
                "mode": "memory" if self._resolved_url == ":memory:" else "remote",
                "error": str(exc),
            }

    def close(self) -> None:
        """Close the underlying Qdrant client."""
        self._client.close()
        logger.info("vector_store_closed")
