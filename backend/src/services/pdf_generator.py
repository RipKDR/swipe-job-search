"""Compliance report PDF generator using ReportLab.

Produces DEWR/Workforce Australia-style compliance report PDFs from
persisted compliance_report_rows data. The PDF includes:
- Report header with provider info, period, and generation timestamp
- Per-candidate activity summary table
- Detailed row breakdown (swipes, matches, hires)
- Audit trail footer with report ID and generation metadata
"""

from __future__ import annotations

import io
from datetime import date, datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# ── Colour palette ─────────────────────────────────────────────────────────

INDIGO = colors.HexColor("#4f46e5")
EMERALD = colors.HexColor("#059669")
SLATE_700 = colors.HexColor("#334155")
SLATE_600 = colors.HexColor("#475569")
SLATE_200 = colors.HexColor("#e2e8f0")
SLATE_100 = colors.HexColor("#f1f5f9")
WHITE = colors.white


# ── Styles ─────────────────────────────────────────────────────────────────

_sheets = getSampleStyleSheet()

STYLE_TITLE = ParagraphStyle(
    "ComplianceTitle",
    parent=_sheets["Heading1"],
    fontSize=20,
    textColor=INDIGO,
    spaceAfter=4 * mm,
    alignment=TA_LEFT,
)

STYLE_SUBTITLE = ParagraphStyle(
    "ComplianceSubtitle",
    parent=_sheets["Normal"],
    fontSize=10,
    textColor=SLATE_600,
    spaceAfter=12 * mm,
)

STYLE_SECTION = ParagraphStyle(
    "SectionHeader",
    parent=_sheets["Heading2"],
    fontSize=13,
    textColor=INDIGO,
    spaceBefore=8 * mm,
    spaceAfter=4 * mm,
)

STYLE_BODY = ParagraphStyle(
    "ComplianceBody",
    parent=_sheets["Normal"],
    fontSize=9,
    textColor=SLATE_700,
    leading=13,
)

STYLE_LABEL = ParagraphStyle(
    "Label",
    parent=_sheets["Normal"],
    fontSize=8,
    textColor=SLATE_600,
)

STYLE_FOOTER = ParagraphStyle(
    "Footer",
    parent=_sheets["Normal"],
    fontSize=7,
    textColor=SLATE_600,
    alignment=TA_CENTER,
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _fmt_date(d: str | date) -> str:
    """Format a date string or date object to AU format."""
    if isinstance(d, date):
        return d.strftime("%d %b %Y")
    try:
        return datetime.fromisoformat(d).strftime("%d %b %Y")
    except (ValueError, TypeError):
        return str(d)


def _info_row(label: str, value: str) -> list[Paragraph]:
    """Return two-cell row for a key-value info pair."""
    return [
        Paragraph(f"<b>{label}</b>", STYLE_BODY),
        Paragraph(value, STYLE_BODY),
    ]


def _table_style(*, header: bool = True) -> TableStyle:
    """Standard compliance table style."""
    cmds = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (-1, -1), SLATE_700),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, SLATE_200),
    ]
    if header:
        cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
        ]
    return TableStyle(cmds)


# ── Core generator ─────────────────────────────────────────────────────────


def generate_compliance_pdf(
    *,
    report_id: str,
    provider_name: str | None,
    candidate_name: str | None,
    period_start: str | date,
    period_end: str | date,
    report_type: str,
    generated_at: str | None,
    rows: list[dict[str, Any]],
    activity_summary: dict[str, Any] | None,
) -> bytes:
    """Generate a compliance report PDF and return the bytes.

    Args:
        report_id: UUID of the compliance_reports row.
        provider_name: Display name of the provider / organisation.
        candidate_name: Display name of the candidate (if single-candidate report).
        period_start: ISO date string or date for the report period start.
        period_end: ISO date string or date for the period end.
        report_type: Machine-readable report type (weekly_summary etc).
        generated_at: ISO timestamp of generation.
        rows: List of compliance_report_rows dicts (the persisted rows).
        activity_summary: The aggregated activity summary dict, or None.

    Returns:
        PDF as bytes.
    """
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    story: list[Any] = []

    # ── Title block ───────────────────────────────────────────────────
    story.append(Paragraph("Workforce Australia Compliance Report", STYLE_TITLE))
    story.append(Spacer(1, 2 * mm))

    story.append(
        Paragraph(
            f"<b>Report ID:</b> {report_id} &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"<b>Type:</b> {report_type.replace('_', ' ').title()} &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"<b>Generated:</b> {_fmt_date(generated_at or '')}",
            STYLE_SUBTITLE,
        )
    )

    # ── Period info ───────────────────────────────────────────────────
    info_data = [
        _info_row("Provider", provider_name or "—"),
        _info_row("Candidate", candidate_name or "—"),
        _info_row("Period", f"{_fmt_date(period_start)} — {_fmt_date(period_end)}"),
    ]
    info_table = Table(info_data, colWidths=[45 * mm, 120 * mm])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6 * mm))

    # ── Activity Summary ───────────────────────────────────────────────
    story.append(Paragraph("Activity Summary", STYLE_SECTION))

    if activity_summary:
        summary_rows = [
            [
                Paragraph("<b>Metric</b>", STYLE_BODY),
                Paragraph("<b>Value</b>", STYLE_BODY),
            ],
            ["Total Swipes", str(activity_summary.get("total_swipes", 0))],
            ["Right Swipes (Applications)", str(activity_summary.get("right_swipes", 0))],
            ["Unique Jobs Interacted", str(activity_summary.get("unique_jobs_interacted", 0))],
            ["Total Matches", str(activity_summary.get("total_matches", 0))],
            ["Total Hires", str(activity_summary.get("total_hires", 0))],
            ["Candidates in Report", str(activity_summary.get("candidate_rows", len(rows)))],
        ]
        summary_table = Table(summary_rows, colWidths=[80 * mm, 80 * mm])
        # alternate row colour
        alt_cmds = []
        for i in range(1, len(summary_rows)):
            if i % 2 == 0:
                alt_cmds.append(("BACKGROUND", (0, i), (-1, i), SLATE_100))
        summary_table.setStyle(_table_style())
        for cmd in alt_cmds:
            summary_table.setStyle(TableStyle([cmd]))
        story.append(summary_table)
    else:
        story.append(Paragraph("No activity summary data available.", STYLE_BODY))

    story.append(Spacer(1, 6 * mm))

    # ── Per-candidate detail rows ──────────────────────────────────────
    if rows:
        story.append(Paragraph("Candidate Details", STYLE_SECTION))

        for i, row in enumerate(rows):
            # Section per candidate
            candidate_id = row.get("candidate_id", "—")
            status = row.get("status", "unknown")

            story.append(Paragraph(
                f"Candidate {i + 1}: {candidate_id[:8]}…  "
                f"<font color='{'#059669' if status == 'completed' else '#dc2626'}'>"
                f"[{status.upper()}]</font>",
                ParagraphStyle(
                    "CandidateSub",
                    parent=STYLE_BODY,
                    fontSize=10,
                    textColor=INDIGO,
                    spaceBefore=4 * mm,
                    spaceAfter=2 * mm,
                ),
            ))

            detail_rows = [
                [
                    Paragraph("<b>Metric</b>", STYLE_BODY),
                    Paragraph("<b>Count</b>", STYLE_BODY),
                ],
                ["Total Swipes", str(row.get("swipe_count", 0))],
                ["Right Swipes (Applications)", str(row.get("right_swipe_count", 0))],
                ["Unique Jobs Interacted", str(row.get("unique_jobs_interacted", 0))],
                ["Matches", str(row.get("match_count", 0))],
                ["Hires", str(row.get("hire_count", 0))],
            ]

            earnings = row.get("total_earnings")
            if earnings is not None:
                detail_rows.append(["Est. Earnings", f"${float(earnings):.2f}"])

            if row.get("error_message"):
                detail_rows.append(["Error", row["error_message"]])

            detail_table = Table(detail_rows, colWidths=[80 * mm, 80 * mm])
            alt_cmds = []
            for j in range(1, len(detail_rows)):
                if j % 2 == 0:
                    alt_cmds.append(("BACKGROUND", (0, j), (-1, j), SLATE_100))
            detail_table.setStyle(_table_style())
            for cmd in alt_cmds:
                detail_table.setStyle(TableStyle([cmd]))
            story.append(detail_table)

    # ── Footer ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph(
        "— End of Report —",
        ParagraphStyle("EndMark", parent=STYLE_FOOTER, fontSize=8, textColor=SLATE_600),
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        f"Hi-Hired Compliance Report • {report_id} • Generated {_fmt_date(generated_at or datetime.now(timezone.utc).isoformat())} • "
        "This is a system-generated report. Data sourced from Hi-Hired platform activity records.",
        STYLE_FOOTER,
    ))

    # Build
    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes
