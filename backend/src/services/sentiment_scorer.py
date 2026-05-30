"""Local sentiment analysis using TextBlob with aggregate scoring.

Provides:
  - SentimentScorer: analyze text and aggregate scores locally (no external API).
    Works with or without TextBlob installed (falls back to a simple keyword-based
    heuristic if the package is unavailable).
"""

from __future__ import annotations

import re
from typing import Any

try:
    from textblob import TextBlob

    _HAS_TEXTBLOB = True
except ImportError:
    _HAS_TEXTBLOB = False

# ── Keyword-based fallback lexicons ────────────────────────────────────

_POSITIVE_WORDS: frozenset[str] = frozenset(
    {
        "good",
        "great",
        "excellent",
        "amazing",
        "awesome",
        "fantastic",
        "wonderful",
        "outstanding",
        "superb",
        "brilliant",
        "positive",
        "recommend",
        "love",
        "happy",
        "impressed",
        "satisfied",
        "helpful",
        "professional",
        "supportive",
        "fair",
        "transparent",
        "responsive",
        "grateful",
        "thank",
        "pleased",
        "perfect",
        "best",
    }
)

_NEGATIVE_WORDS: frozenset[str] = frozenset(
    {
        "bad",
        "terrible",
        "awful",
        "horrible",
        "worst",
        "poor",
        "negative",
        "avoid",
        "hate",
        "disappointed",
        "unprofessional",
        "rude",
        "dishonest",
        "misleading",
        "scam",
        "toxic",
        "unfair",
        "ghosted",
        "no response",
        "unresponsive",
        "frustrating",
        "abusive",
        "discriminat",
        "exploit",
        "underpaid",
        "overwork",
    }
)


def _keyword_score(text: str) -> float:
    """Simple keyword-count sentiment score in [-1.0, 1.0]."""
    lower = text.lower()
    pos_count = sum(1 for w in _POSITIVE_WORDS if re.search(rf"\b{re.escape(w)}\b", lower))
    neg_count = sum(1 for w in _NEGATIVE_WORDS if re.search(rf"\b{re.escape(w)}\b", lower))
    total = pos_count + neg_count
    if total == 0:
        return 0.0
    return (pos_count - neg_count) / total


# ── Public API ─────────────────────────────────────────────────────────


class SentimentScorer:
    """Analyse text polarity using TextBlob (preferred) or keyword fallback.

    Parameters
    ----------
    use_fallback:
        If True, always use the keyword-based fallback even when TextBlob
        is available.  Useful for deterministic tests.  Default False.
    """

    def __init__(self, use_fallback: bool = False) -> None:
        self._use_fallback = use_fallback or not _HAS_TEXTBLOB

    # ── Public API ─────────────────────────────────────────────────

    def analyze_text(self, text: str) -> dict[str, Any]:
        """Analyse a single text fragment and return sentiment metadata.

        Returns
        -------
        dict with keys:
            sentiment : ``'positive'`` | ``'neutral'`` | ``'negative'``
            score     : float in [-1.0, 1.0]  (polarity)
        """
        score = self._score(text)
        label = self._label(score)
        return {"sentiment": label, "score": round(score, 4)}

    def aggregate_scores(self, scores: list[dict[str, Any]]) -> dict[str, Any]:
        """Aggregate multiple ``analyze_text`` results into a summary.

        Parameters
        ----------
        scores:
            List of dicts as returned by ``analyze_text``.

        Returns
        -------
        dict with keys:
            average_score  : float
            sample_count   : int
            distribution   : dict[str, int]  — e.g. ``{'positive': 3, …}``
        """
        n = len(scores)
        if n == 0:
            return {
                "average_score": 0.0,
                "sample_count": 0,
                "distribution": {"positive": 0, "neutral": 0, "negative": 0},
            }

        total = 0.0
        dist: dict[str, int] = {"positive": 0, "neutral": 0, "negative": 0}
        for s in scores:
            total += s.get("score", 0.0)
            label = s.get("sentiment", "neutral")
            if label in dist:
                dist[label] += 1

        return {
            "average_score": round(total / n, 4),
            "sample_count": n,
            "distribution": dist,
        }

    # ── Internal helpers ───────────────────────────────────────────

    def _score(self, text: str) -> float:
        if self._use_fallback:
            return _keyword_score(text)
        return TextBlob(text).sentiment.polarity  # type: ignore[union-attr]

    @staticmethod
    def _label(score: float) -> str:
        if score > 0.1:
            return "positive"
        if score < -0.1:
            return "negative"
        return "neutral"
