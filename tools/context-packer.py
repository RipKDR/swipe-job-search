#!/usr/bin/env python3
"""
Session Context Packer — generates the Progressive Context Packing snapshot.

Outputs a structured project state block that re-establishes context
across AI-assisted sessions. Use at the start of any new session.

Usage:
  python3 tools/context-packer.py              # Print to stdout
  python3 tools/context-packer.py --file output.md  # Write to file
  python3 tools/context-packer.py --json       # Machine-readable JSON
"""

import argparse
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional


ROOT = Path(__file__).resolve().parent.parent


def run(cmd: list[str], cwd: Optional[str] = None) -> str:
    try:
        r = subprocess.run(
            cmd, capture_output=True, text=True, cwd=cwd or str(ROOT), timeout=10
        )
        return r.stdout.strip()
    except Exception:
        return ""


def get_git_info() -> dict:
    return {
        "branch": run(["git", "rev-parse", "--abbrev-ref", "HEAD"]),
        "commit": run(["git", "rev-parse", "--short", "HEAD"]),
        "message": run(["git", "log", "-1", "--pretty=%s"]),
        "author": run(["git", "log", "-1", "--pretty=%an"]),
        "date": run(["git", "log", "-1", "--pretty=%ad", "--date=short"]),
        "staged_changes": len(
            run(["git", "diff", "--cached", "--name-only"]).split("\n")
        ),
        "uncommitted_changes": len(run(["git", "diff", "--name-only"]).split("\n")),
        "unpushed_commits": len(
            run(["git", "log", "@{u}..HEAD", "--oneline"]).split("\n")
        )
        if run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
        else 0,
    }


def get_test_status() -> dict:
    # Check the mobile test state
    mobile_test_file = ROOT / "apps/mobile/vitest.config.ts"
    backend_test_dir = ROOT / "backend"

    status = {}
    if mobile_test_file.exists():
        r = subprocess.run(
            [
                "pnpm",
                "test",
                "--",
                "--reporter",
                "json",
                "--reporter",
                "verbose",
                "--run",
            ],
            capture_output=True,
            text=True,
            cwd=str(ROOT / "apps/mobile"),
            timeout=120,
        )
        # Extract summary from output
        for line in r.stdout.split("\n") + r.stderr.split("\n"):
            if "Tests" in line and any(
                x in line for x in ["passed", "failed", "total"]
            ):
                status["mobile"] = line.strip()
                break
        if not status.get("mobile"):
            status["mobile"] = "See vitest output for details"

    if backend_test_dir.exists():
        status["backend"] = "backend/ exists — not auto-run in context packer"

    return status


def get_package_info() -> dict:
    """Extract key dependency versions."""
    mobile_pkg = ROOT / "apps/mobile/package.json"
    info = {"mobile": {}, "backend": {}}

    if mobile_pkg.exists():
        import json

        data = json.loads(mobile_pkg.read_text())
        info["mobile"] = {
            "expo": data.get("dependencies", {}).get("expo", ""),
            "reanimated": data.get("dependencies", {}).get(
                "react-native-reanimated", ""
            ),
            "gesture-handler": data.get("dependencies", {}).get(
                "react-native-gesture-handler", ""
            ),
            "tanstack-query": data.get("dependencies", {}).get(
                "@tanstack/react-query", ""
            ),
        }

    return info


def get_project_state() -> dict:
    """Gather the full project state snapshot."""
    git_info = get_git_info()
    test_status = get_test_status()
    pkg_info = get_package_info()

    return {
        "project": "Hi-Hired",
        "tagline": "Mobile-first casual job marketplace for Melbourne",
        "generated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "git": {
            "branch": git_info["branch"],
            "last_commit": f"{git_info['commit']}: {git_info['message']}",
            "by": git_info["author"],
            "staged": git_info["staged_changes"],
            "uncommitted": git_info["uncommitted_changes"],
            "unpushed": git_info["unpushed_commits"],
        },
        "tech_stack": {
            "mobile": {
                "framework": f"Expo SDK {pkg_info['mobile'].get('expo', '')}",
                "animations": f"Reanimated v{pkg_info['mobile'].get('reanimated', '')}",
                "gestures": f"Gesture Handler v{pkg_info['mobile'].get('gesture-handler', '')}",
                "server_state": f"TanStack Query v{pkg_info['mobile'].get('tanstack-query', '')}",
                "local_state": "Zustand",
                "storage": "MMKV + Expo SecureStore",
                "routing": "Expo Router (file-based)",
                "styling": "NativeWind v5 (Tailwind for RN)",
                "monorepo": "pnpm workspaces",
            },
            "backend": {
                "api": "Python FastAPI",
                "task_queue": "Celery + Redis",
                "database": "PostgreSQL (Supabase Sydney)",
                "vector_search": "Qdrant",
                "ml_tracking": "MLflow",
                "schemas": "Pydantic v2",
                "events": "Redis Pub/Sub",
            },
            "infrastructure": {
                "cloud": "AWS (ap-southeast-2)",
                "orchestration": "EKS (Kubernetes)",
                "infra_as_code": "Terraform",
                "ci_cd": "GitHub Actions",
                "tracing": "OpenTelemetry + Jaeger",
                "secrets": "HashiCorp Vault",
            },
        },
        "test_status": test_status,
    }


def format_markdown(state: dict) -> str:
    git = state["git"]
    ts = state["tech_stack"]
    tests = state["test_status"]
    s = state

    out = [
        f"# Hi-Hired — Session Context ({s['generated_at']})",
        "",
        f"**{s['tagline']}**",
        "",
        "## PROJECT STATE SNAPSHOT",
        "",
        f"- **Branch:** {git['branch']}",
        f"- **Last commit:** {git['last_commit']}",
        f"- **Staged:** {git['staged']} · **Uncommitted:** {git['uncommitted']} · **Unpushed:** {git['unpushed']}",
        "",
        "### Tech Stack",
        "",
        "**Mobile:**",
        f"- {ts['mobile']['framework']} · {ts['mobile']['animations']} · {ts['mobile']['gestures']}",
        f"- {ts['mobile']['server_state']} · {ts['mobile']['local_state']}",
        f"- {ts['mobile']['storage']} · {ts['mobile']['routing']}",
        f"- {ts['mobile']['styling']} · Monorepo: {ts['mobile']['monorepo']}",
        "",
        "**Backend:**",
        f"- API: {ts['backend']['api']}",
        f"- Task queue: {ts['backend']['task_queue']}",
        f"- Database: {ts['backend']['database']}",
        f"- Vector search: {ts['backend']['vector_search']}",
        f"- ML: {ts['backend']['ml_tracking']}",
        f"- Schemas: {ts['backend']['schemas']} · Events: {ts['backend']['events']}",
        "",
        "**Infrastructure:**",
        f"- Cloud: {ts['infrastructure']['cloud']}",
        f"- Orchestration: {ts['infrastructure']['orchestration']}",
        f"- IaC: {ts['infrastructure']['infra_as_code']}",
        f"- CI/CD: {ts['infrastructure']['ci_cd']}",
        f"- Tracing: {ts['infrastructure']['tracing']}",
        f"- Secrets: {ts['infrastructure']['secrets']}",
        "",
        "### Test Status",
        f"- Mobile: {tests.get('mobile', 'Not run')}",
    ]

    if tests.get("backend"):
        out.append(f"- Backend: {tests['backend']}")

    return "\n".join(out)


def main():
    parser = argparse.ArgumentParser(description="Hi-Hired Session Context Packer")
    parser.add_argument("--file", "-f", type=str, help="Write output to file")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    state = get_project_state()

    if args.json:
        output = json.dumps(state, indent=2)
    else:
        output = format_markdown(state)

    if args.file:
        path = Path(args.file).resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(output)
        print(f"Context written to {path}")
    else:
        print(output)


if __name__ == "__main__":
    main()
