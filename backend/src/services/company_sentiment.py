"""Company Sentiment service — legal-reviewed stub with local scoring.

**Legal notice (AU defamation / ACL):** The ``scrape_and_score`` method is a
*stub* that only logs intent.  Real web scraping of employer-review sources
(e.g. Glassdoor, Indeed reviews) must undergo legal review before enabling,
per Australian defamation law and the Australian Consumer Law (misleading
conduct).  See ``docs/legal/sentiment-scraping.md`` (TODO) for the
risk assessment framework.

Once legal sign-off is obtained:
  1. Replace the stub body with real scraped text collection using
     ``ScrapingSession`` from ``scraping_session.py``.
  2. Pass each text fragment through ``SentimentScorer.analyze_text()``.
  3. Persist the scored rows via the Supabase client.
  4. Call ``refresh_company_aggregates()`` to refresh the materialised view.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from supabase import Client as SupabaseClient

from src.services.sentiment_scorer import SentimentScorer

logger = logging.getLogger(__name__)


class CompanySentimentService:
    """Manage company sentiment data — persisted scores + materialised aggregates.

    Parameters
    ----------
    supabase:
        Authenticated Supabase client (service-role privileged for writes).
    scorer:
        Optional custom ``SentimentScorer`` instance.  Defaults to a plain one.
    """

    def __init__(
        self,
        supabase: SupabaseClient,
        scorer: Optional[SentimentScorer] = None,
    ) -> None:
        self._supabase = supabase
        self._scorer = scorer or SentimentScorer()

    # ── Stub (legal review required before enabling) ────────────────

    def scrape_and_score(self, company_name: str) -> dict[str, Any]:
        """**STUB** — logs intent.  No real scraping happens.

        Parameters
        ----------
        company_name:
            The employer / company whose reviews would be analysed.

        Returns
        -------
        A dict with status and a legal-review reminder.
        """
        logger.warning(
            "scrape_and_score called for %r — STUB executed. "
            "Real scraping blocked pending AU defamation/ACL legal review.",
            company_name,
        )
        return {
            "status": "stub",
            "company_name": company_name,
            "message": (
                "Real scraping requires legal review per AU defamation law "
                "and ACL. This stub only logs the call."
            ),
        }

    # ── Read-side: query materialised view ──────────────────────────

    def get_aggregate(self, company_name: str) -> Optional[dict[str, Any]]:
        """Query the ``company_aggregates`` materialised view.

        Returns
        -------
        A dict with ``{company_name, avg_score, sample_count, last_updated,
        trend}``, or ``None`` if no data exists for the company.
        """
        result = (
            self._supabase.table("company_aggregates")
            .select("*")
            .eq("company_name", company_name)
            .maybe_single()
            .execute()
        )
        if not result.data:
            return None
        return dict(result.data)
