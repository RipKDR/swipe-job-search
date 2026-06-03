"""Tests for the Qdrant vector store integration.

All tests use the in-memory Qdrant mode (``:memory:``) so they require
zero infrastructure.
"""

from __future__ import annotations

from datetime import datetime, timezone as tz
from uuid import UUID, uuid4

import pytest

from src.schemas.jobs import EmploymentType, Location, NormalizedJob, SalaryRange
from src.services.vector_store import COLLECTION_NAME, VECTOR_SIZE, VectorStore

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def store() -> VectorStore:
    """Return a VectorStore backed by the in-memory Qdrant instance."""
    vs = VectorStore(url=":memory:")
    yield vs
    try:
        vs.close()
    except Exception:
        pass


@pytest.fixture
def sample_job() -> NormalizedJob:
    """A fully populated NormalizedJob for testing."""
    return NormalizedJob(
        id=uuid4(),
        title="Senior Software Engineer",
        company_name="TechCorp",
        location=Location(
            suburb="Sydney CBD",
            state="NSW",
            postcode="2000",
        ),
        employment_type=EmploymentType.full_time,
        salary=SalaryRange(min=150_000.0, max=200_000.0),
        description="Build and scale backend services using Python and cloud-native technologies.",
        requirements=[],
        benefits=["Remote work", "Equity"],
        source_url="https://example.com/job/123",
        source_name="seek",
        posted_at=datetime.now(tz=tz.utc),
        expires_at=datetime(2026, 12, 31, tzinfo=tz.utc),
        is_active=True,
    )


@pytest.fixture
def sample_embedding() -> list[float]:
    """A dummy 1536-d embedding (all zeros with a mild gradient)."""
    return [i / 1536.0 for i in range(VECTOR_SIZE)]


# ---------------------------------------------------------------------------
# Construction & health
# ---------------------------------------------------------------------------


class TestVectorStoreCreation:
    """Verify the store is created correctly in memory mode."""

    def test_in_memory_creation(self, store: VectorStore) -> None:
        """The in-memory store should create the ``hi_hired_jobs`` collection."""
        collections = store._client.get_collections().collections  # noqa: SLF001
        names = {c.name for c in collections}
        assert COLLECTION_NAME in names

    def test_health_ok(self, store: VectorStore) -> None:
        """Health check returns ``status=ok`` for a healthy in-memory store."""
        result = store.health()
        assert result["status"] == "ok"
        assert result["collection"] == COLLECTION_NAME
        assert result["points_count"] >= 0
        assert result["mode"] == "memory"


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------


class TestIndexAndSearch:
    """Index a job and verify it can be found via similarity search."""

    def test_index_returns_true(
        self, store: VectorStore, sample_job: NormalizedJob, sample_embedding: list[float]
    ) -> None:
        """``index_job`` should return ``True`` on success."""
        assert store.index_job(sample_job, sample_embedding) is True

    def test_search_returns_indexed_job(
        self, store: VectorStore, sample_job: NormalizedJob, sample_embedding: list[float]
    ) -> None:
        """Searching with the same embedding should return the indexed job."""
        store.index_job(sample_job, sample_embedding)
        results = store.search_similar(query_embedding=sample_embedding, limit=10)
        assert len(results) >= 1
        # The result should carry the same job_id
        matching = [r for r in results if r.get("job_id") == str(sample_job.id)]
        assert len(matching) == 1, f"Expected exactly one match, got {len(matching)}"
        assert matching[0]["title"] == sample_job.title
        assert matching[0]["company_name"] == sample_job.company_name
        assert matching[0]["employment_type"] == sample_job.employment_type.value
        assert matching[0]["location_state"] == sample_job.location.state
        # Verify score is present
        assert "_score" in matching[0]
        assert isinstance(matching[0]["_score"], float)

    def test_search_with_exact_filters(
        self, store: VectorStore, sample_job: NormalizedJob, sample_embedding: list[float]
    ) -> None:
        """Filters on ``employment_type`` and ``location_state`` should narrow results."""
        store.index_job(sample_job, sample_embedding)

        # Matching filter — should find the job
        results = store.search_similar(
            query_embedding=sample_embedding,
            filters={"employment_type": "full_time", "location_state": "NSW"},
            limit=10,
        )
        assert any(r["job_id"] == str(sample_job.id) for r in results)

        # Mismatched filter — should *not* find the job
        results = store.search_similar(
            query_embedding=sample_embedding,
            filters={"employment_type": "part_time"},
            limit=10,
        )
        assert not any(r["job_id"] == str(sample_job.id) for r in results)

    def test_search_with_salary_min_filter(
        self, store: VectorStore, sample_job: NormalizedJob, sample_embedding: list[float]
    ) -> None:
        """``salary_min`` filter (gte) should work correctly."""
        store.index_job(sample_job, sample_embedding)

        # salary_min below job min — should match
        results = store.search_similar(
            query_embedding=sample_embedding,
            filters={"salary_min": 100_000.0},
            limit=10,
        )
        assert any(r["job_id"] == str(sample_job.id) for r in results)

        # salary_min above job max — should not match
        results = store.search_similar(
            query_embedding=sample_embedding,
            filters={"salary_min": 250_000.0},
            limit=10,
        )
        assert not any(r["job_id"] == str(sample_job.id) for r in results)

    def test_search_without_filters_returns_all(
        self, store: VectorStore, sample_job: NormalizedJob, sample_embedding: list[float]
    ) -> None:
        """Omitting filters should return results regardless of payload values."""
        store.index_job(sample_job, sample_embedding)
        results = store.search_similar(query_embedding=sample_embedding, limit=10)
        assert any(r["job_id"] == str(sample_job.id) for r in results)

    def test_search_returns_empty_when_no_match(self, store: VectorStore) -> None:
        """Searching an empty store returns an empty list."""
        dummy_vec = [0.0] * VECTOR_SIZE
        results = store.search_similar(query_embedding=dummy_vec, limit=10)
        assert results == []

    def test_search_respects_limit(self, store: VectorStore, sample_embedding: list[float]) -> None:
        """The ``limit`` parameter should cap the number of results."""
        # Index 5 jobs
        for i in range(5):
            job = NormalizedJob(
                id=uuid4(),
                title=f"Job {i}",
                company_name="TestCo",
                location=Location(suburb="Melbourne", state="VIC", postcode="3000"),
                employment_type=EmploymentType.full_time,
                expires_at=datetime(2026, 12, 31, tzinfo=tz.utc),
            )
            store.index_job(job, sample_embedding)

        results = store.search_similar(query_embedding=sample_embedding, limit=3)
        assert len(results) == 3


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


class TestDelete:
    """Verify job deletion works correctly."""

    def test_delete_existing_job(
        self, store: VectorStore, sample_job: NormalizedJob, sample_embedding: list[float]
    ) -> None:
        """Deleting an indexed job should remove it from search results."""
        store.index_job(sample_job, sample_embedding)
        assert store.delete_job(sample_job.id) is True

        results = store.search_similar(query_embedding=sample_embedding, limit=10)
        assert not any(r["job_id"] == str(sample_job.id) for r in results)

    def test_delete_nonexistent_job(self, store: VectorStore) -> None:
        """Deleting a non-existent job should not raise an error."""
        result = store.delete_job(UUID("00000000-0000-0000-0000-000000000000"))
        # In-memory mode returns completed even for no-op deletes
        assert result is True


# ---------------------------------------------------------------------------
# Edge cases with None salary
# ---------------------------------------------------------------------------


class TestNoneSalary:
    """Jobs without salary info should still be indexed correctly."""

    def test_job_without_salary(self, store: VectorStore, sample_embedding: list[float]) -> None:
        """A job with ``salary=None`` should be indexable and searchable."""
        job = NormalizedJob(
            id=uuid4(),
            title="Volunteer Coordinator",
            company_name="CharityOrg",
            location=Location(suburb="Brisbane", state="QLD", postcode="4000"),
            employment_type=EmploymentType.casual,
            salary=None,
            expires_at=datetime(2026, 12, 31, tzinfo=tz.utc),
        )
        store.index_job(job, sample_embedding)
        results = store.search_similar(query_embedding=sample_embedding, limit=10)
        assert any(r["job_id"] == str(job.id) for r in results)
        # salary_min / salary_max should be None in payload
        match = [r for r in results if r["job_id"] == str(job.id)][0]
        assert match["salary_min"] is None
        assert match["salary_max"] is None
