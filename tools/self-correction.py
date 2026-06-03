#!/usr/bin/env python3
"""
4-Lens Self-Correction — automated code review pre-commit hook.

Runs the Architect-Developer Protocol's 4-lens review on staged changes:
  1st 🛡️ Security Auditor
  2nd ⚡ Performance Engineer
  3rd 🔁 Reliability Engineer
  4th 🧹 Maintainability Review

Usage:
  python3 tools/self-correction.py              # Review staged changes
  python3 tools/self-correction.py --files ...  # Review specific files
  python3 tools/self-correction.py --ci         # CI mode (exit 1 on critical findings)

Configuration via pyproject.toml [tool.self-correction] or .self-correction.yml.

Output: structured review with findings, severity, and file:line references.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional


# ── Severity levels ──


class Severity(Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

    @property
    def score(self) -> int:
        return {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}[self.value]


# ── Findings ──


@dataclass
class Finding:
    lens: str
    severity: Severity
    file: str
    line: Optional[int]
    message: str
    suggestion: Optional[str] = None
    code_snippet: Optional[str] = None


@dataclass
class ReviewResult:
    files: list[str]
    findings: list[Finding] = field(default_factory=list)
    passed: bool = True

    @property
    def total_critical(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.CRITICAL)

    @property
    def total_high(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.HIGH)

    @property
    def total_issues(self) -> int:
        return len(self.findings)

    def add(
        self,
        lens: str,
        sev: Severity,
        file: str,
        msg: str,
        line: Optional[int] = None,
        suggestion: Optional[str] = None,
        snippet: Optional[str] = None,
    ):
        self.findings.append(Finding(lens, sev, file, line, msg, suggestion, snippet))
        if sev in (Severity.CRITICAL, Severity.HIGH):
            self.passed = False

    def to_text(self) -> str:
        if not self.findings:
            return "✅ 4-Lens Self-Correction: No issues found.\n"

        lines = ["## 4-Lens Self-Correction Results\n"]
        for lens_name in [
            "🛡️ Security",
            "⚡ Performance",
            "🔁 Reliability",
            "🧹 Maintainability",
        ]:
            findings = [f for f in self.findings if f.lens == lens_name]
            if not findings:
                continue
            lines.append(f"\n### {lens_name} ({len(findings)} issues)")
            for f in findings:
                loc = f"  {f.file}:{f.line}" if f.line else f"  {f.file}"
                lines.append(f"- **[{f.severity.value}]** {f.message}")
                lines.append(loc)
                if f.suggestion:
                    lines.append(f"  → {f.suggestion}")
        lines.append(
            f"\n---\n**Summary:** {self.total_issues} issues ({self.total_critical} critical, {self.total_high} high)"
        )
        if not self.passed:
            lines.append(
                "⛔ Blocking: Critical or High-severity findings must be resolved."
            )
        return "\n".join(lines)

    def to_json(self) -> str:
        return json.dumps(
            {
                "passed": self.passed,
                "files": self.files,
                "findings": [
                    {
                        "lens": f.lens,
                        "severity": f.severity.value,
                        "file": f.file,
                        "line": f.line,
                        "message": f.message,
                        "suggestion": f.suggestion,
                    }
                    for f in self.findings
                ],
                "summary": {
                    "total": self.total_issues,
                    "critical": self.total_critical,
                    "high": self.total_high,
                },
            },
            indent=2,
        )


# ── Lens Analyzers ──


class LensSecurity:
    """🛡️ Security Auditor: injections, secrets, XSS, auth bypasses."""

    # Patterns that indicate potential security issues
    PATTERNS: list[tuple[str, Severity, str]] = [
        # Hardcoded secrets
        (
            r'(?:api_key|api_secret|password|secret|token|credential)\s*[:=]\s*["\'](?!\{'
            r'|.*os\.environ|.*process\.env|.*import|.*from)[^"\'\\s]{4,}["\']',
            Severity.CRITICAL,
            "Hardcoded credential detected",
        ),
        # SQL injection risk
        (
            r'(?:execute|query|raw_query|query_raw)\s*\(\s*(?:f["\']|f["\']\'.*?\{)',
            Severity.HIGH,
            "Potential SQL injection — f-string in query",
        ),
        # Unsafe eval/exec
        (
            r'\beval\s*\(\s*.*?["\']|exec\s*\(\s*.*?["\']|execScript\s*\(',
            Severity.CRITICAL,
            "Dynamic eval/exec — code injection risk",
        ),
        # Dangerous deserialization
        (
            r"pickle\.loads|yaml\.load\s*\(|marshal\.loads",
            Severity.HIGH,
            "Unsafe deserialization — possible RCE",
        ),
        # Insecure direct object reference
        (
            r'\.from\(\s*["\']\w+["\']\)\s*\.delete\(|\.from\(\s*["\']\w+["\']\)\s*\.update\(',
            Severity.MEDIUM,
            "Potential IDOR — verify RLS/authorization checks exist",
        ),
        # Missing input validation on HTTP params
        (
            r"request\.query\[|request\.form\[|request\.json\b",
            Severity.LOW,
            "Unvalidated user input — ensure type/range validation upstream",
        ),
        # PII in logs
        (
            r"logger\.(?:info|warn|error|debug)\s*\(.*?(?:email|phone|ssn|address|password)",
            Severity.HIGH,
            "Potential PII leakage in log statement",
        ),
        # XSS via dangerouslySetInnerHTML / innerHTML
        (
            r"dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=",
            Severity.CRITICAL,
            "XSS risk — raw HTML injection. Use sanitized approach",
        ),
    ]

    def analyze(self, result: ReviewResult, content: str, filepath: str):
        for pattern, severity, message in self.PATTERNS:
            for m in re.finditer(pattern, content, re.IGNORECASE):
                result.add(
                    "🛡️ Security",
                    severity,
                    filepath,
                    message,
                    line=content[: m.start()].count("\n") + 1,
                )


class LensPerformance:
    """⚡ Performance Engineer: Big-O issues, N+1, blocking I/O, cache misses."""

    PATTERNS: list[tuple[str, Severity, str]] = [
        # Nested loops over collections (potential O(n²))
        (
            r"for\s+\w+\s+in\s+\w+\s*:\s*\n\s+.*?for\s+\w+\s+in\s+\w+",
            Severity.MEDIUM,
            "Nested loop over collections — potential O(n²). Consider hash lookup",
        ),
        # N+1 in ORM
        (
            r"\.each\s*\{.*?\.(?:find|where|get)\b|for.*?in.*?\n.*?\.(?:load|fetch)",
            Severity.HIGH,
            "Potential N+1 database query — use batch loading / JOIN",
        ),
        # Missing index on large collection filter
        (
            r"\.filter\(.*?lambda.*?in.*?\)|\.filter\(.*?==.*?\)",
            Severity.LOW,
            "Linear filter on collection — ensure index or use dict/hash lookup",
        ),
        # Blocking call in async context
        (
            r"(?:time\.sleep|os\.system|subprocess\.call|requests\.get|open\b)\s*\(",
            Severity.MEDIUM,
            "Potential blocking I/O in async context — use async alternative",
        ),
        # Unbounded cache/list growth
        (
            r"cache\.append|list\.append|\.push\b(?!.*?max|.*?limit)",
            Severity.LOW,
            "Unbounded growth — consider max size / TTL",
        ),
        # Large payload fetch without pagination
        (
            r"\.fetch_all|\.all\(\)|select\(\*\)",
            Severity.MEDIUM,
            "Fetching all rows — add pagination / limit clause",
        ),
    ]

    def analyze(self, result: ReviewResult, content: str, filepath: str):
        for pattern, severity, message in self.PATTERNS:
            for m in re.finditer(pattern, content, re.IGNORECASE):
                result.add(
                    "⚡ Performance",
                    severity,
                    filepath,
                    message,
                    line=content[: m.start()].count("\n") + 1,
                )


class LensReliability:
    """🔁 Reliability Engineer: error handling, timeouts, race conditions."""

    PATTERNS: list[tuple[str, Severity, str]] = [
        # Bare except
        (
            r"except\s*:",
            Severity.HIGH,
            "Bare except clause — catches all errors, including SystemExit/KeyboardInterrupt",
        ),
        # Suppressed errors
        (
            r"except\s+\w+\s*(?:,\s*\w+)?\s*:\s*\n\s*(?:pass|#.*|\s*$)",
            Severity.MEDIUM,
            "Caught but suppressed error — at minimum log the exception",
        ),
        # Missing timeout on network call
        (
            r"(?:requests\.(?:get|post|put|delete)|httpx\.AsyncClient|aiohttp\.ClientSession)\s*\(",
            Severity.MEDIUM,
            "External call without explicit timeout — add timeout parameter",
        ),
        # Unhandled promise rejection
        (
            r"\.then\(.*?\)\s*(?:\.catch|\n\s*\.catch)",
            Severity.LOW,
            "Promise chain with catch — ensure errors are handled",
        ),
        # Potential race condition in shared state
        (
            r"(?:global|nonlocal)\s+\w+|shared.*?=|mutex|lock\b(?!.*?acquire)",
            Severity.MEDIUM,
            "Shared mutable state without visible synchronization",
        ),
        # JSON decode without try/except
        (
            r"json\.loads\s*\(|json\.load\s*\(",
            Severity.LOW,
            "JSON decode without try/except — invalid JSON will crash",
        ),
    ]

    def analyze(self, result: ReviewResult, content: str, filepath: str):
        for pattern, severity, message in self.PATTERNS:
            for m in re.finditer(pattern, content, re.IGNORECASE):
                result.add(
                    "🔁 Reliability",
                    severity,
                    filepath,
                    message,
                    line=content[: m.start()].count("\n") + 1,
                )

    def check_noqa(self, result: ReviewResult, content: str, filepath: str):
        """Flag excessive noqa suppressions."""
        count = len(re.findall(r"# noqa", content))
        if count > 5:
            result.add(
                "🔁 Reliability",
                Severity.LOW,
                filepath,
                f"Excessive noqa suppressions ({count} found) — resolve issues instead of silencing them",
            )


class LensMaintainability:
    """🧹 Maintainability Review: duplication, types, naming, coupling."""

    def analyze(self, result: ReviewResult, content: str, filepath: str):
        ext = Path(filepath).suffix
        lines = content.split("\n")

        # Check file length
        if len(lines) > 500:
            result.add(
                "🧹 Maintainability",
                Severity.LOW,
                filepath,
                f"File too long ({len(lines)} lines) — consider splitting into modules",
            )
        elif len(lines) > 1000:
            result.add(
                "🧹 Maintainability",
                Severity.MEDIUM,
                filepath,
                f"Very long file ({len(lines)} lines) — strongly consider splitting",
            )

        # Check function length (approximate: count blank-line-separated blocks)
        blank_line_indices = (
            [-1]
            + [i for i, line_text in enumerate(lines) if not line_text.strip()]
            + [len(lines)]
        )
        for i in range(len(blank_line_indices) - 1):
            block_start = blank_line_indices[i] + 1
            block_end = blank_line_indices[i + 1]
            block_len = block_end - block_start

            if block_len > 80 and re.search(
                r"def\s+\w+\s*\(", "\n".join(lines[block_start:block_end])
            ):
                first_def = next(
                    (
                        j
                        for j in range(block_start, block_end)
                        if re.search(r"def\s+\w+\s*\(", lines[j])
                    ),
                    block_start,
                )
                result.add(
                    "🧹 Maintainability",
                    Severity.LOW,
                    filepath,
                    f"Function too long (~{block_len} lines) — consider extracting helper functions",
                    line=first_def + 1,
                )

        # Check for missing type annotations (Python)
        if ext == ".py":
            for i, line in enumerate(lines):
                m = re.match(r"^def\s+(\w+)\s*\(", line)
                if m:
                    func_name = m.group(1)
                    if func_name.startswith("_"):
                        continue  # Skip private helpers
                    if "):" in line and not re.search(r":\s*\w+,\s*|:\s*\w+\)", line):
                        if not re.search(r"# type:.*", line):
                            result.add(
                                "🧹 Maintainability",
                                Severity.LOW,
                                filepath,
                                f"Function '{func_name}' missing parameter type annotations",
                                line=i + 1,
                            )

        # Check for TODO and FIXME
        for i, line in enumerate(lines):
            if re.search(r"\bTODO\b", line) and not re.search(
                r"# TODO\s*\(.*?\)", line
            ):
                result.add(
                    "🧹 Maintainability",
                    Severity.LOW,
                    filepath,
                    "Unattributed TODO — add owner: # TODO(username):",
                    line=i + 1,
                )
            if re.search(r"\bFIXME\b", line):
                result.add(
                    "🧹 Maintainability",
                    Severity.LOW,
                    filepath,
                    "FIXME found — ensure it's tracked as an issue",
                    line=i + 1,
                )


# ── Main runner ──


def get_staged_files() -> list[str]:
    """Get list of staged Python/TS/JS files."""
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        capture_output=True,
        text=True,
        cwd=find_git_root(),
    )

    extensions = {".py", ".ts", ".tsx", ".js", ".jsx"}
    files = []
    for f in result.stdout.strip().split("\n"):
        f = f.strip()
        if f and Path(f).suffix in extensions:
            files.append(f)
    return files


def find_git_root() -> str:
    """Find git root from cwd."""
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    return result.stdout.strip() or "."


def read_file_content(filepath: str) -> Optional[str]:
    """Read staged content of a file (not working tree)."""
    try:
        result = subprocess.run(
            ["git", "show", f":0:{filepath}"],
            capture_output=True,
            text=True,
            cwd=find_git_root(),
        )
        if result.returncode == 0:
            return result.stdout
    except Exception:
        pass
    # Fallback to working tree
    try:
        with open(os.path.join(find_git_root(), filepath), "r") as f:
            return f.read()
    except Exception:
        return None


def run_review(files: list[str]) -> ReviewResult:
    """Run all 4 lenses on the given files."""
    lenses = [
        LensSecurity(),
        LensPerformance(),
        LensReliability(),
        LensMaintainability(),
    ]
    result = ReviewResult(files=files)

    for filepath in files:
        content = read_file_content(filepath)
        if content is None:
            continue
        for lens in lenses:
            lens.analyze(result, content, filepath)
        # Extra checks
        if isinstance(lenses[2], LensReliability):
            lenses[2].check_noqa(result, content, filepath)

    return result


def main():
    parser = argparse.ArgumentParser(description="4-Lens Self-Correction code review")
    parser.add_argument("--files", nargs="+", help="Files to review (default: staged)")
    parser.add_argument(
        "--ci", action="store_true", help="CI mode: exit 1 on critical/high"
    )
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    if args.files:
        files = args.files
    else:
        files = get_staged_files()

    if not files:
        print("No staged files to review.")
        return 0

    result = run_review(files)
    print(result.to_text() if not args.json else result.to_json())

    if args.ci and not result.passed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
