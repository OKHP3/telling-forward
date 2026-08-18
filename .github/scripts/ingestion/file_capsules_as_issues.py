#!/usr/bin/env python3
"""
file_capsules_as_issues.py

Final ingestion step: take the validated capsule JSON from
extract_capsules.py and file each one as a GitHub Issue on the target
storyworld repo, labeled "capsule" and "state:draft" — never any other
state. This mirrors what create_draft_capsule does in
artifacts/mcp-server/src/tools/create-draft-capsule.ts for the MCP tier,
so a capsule looks the same on GitHub regardless of which ingestion tier
produced it.

Runs with the repository's own GITHUB_TOKEN (the default token GitHub
Actions provides to a workflow, scoped to the repo the workflow runs in —
NOT the app's GITHUB_PAT secret and NOT a contributor's personal token).
That default token already has issues:write on its own repo, so no extra
secret configuration is needed for this tier.

Usage:
    python3 file_capsules_as_issues.py <capsules.json> <owner> <repo>
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def build_issue_body(capsule: dict) -> str:
    lines = [
        f"**Kind:** {capsule['kind']}",
    ]
    if capsule.get("role"):
        lines.append(f"**Role:** {capsule['role']}")
    lines.append(f"**Confidence:** {capsule['confidence']}")
    lines.append("")
    lines.append(capsule["body"])
    if capsule.get("sourceExcerpt"):
        excerpt = capsule["sourceExcerpt"].replace("\n", "\n> ")
        lines.append(f"\n---\n**Source excerpt:**\n\n> {excerpt}")
    lines.append(
        "\n---\n*Filed automatically by the Tier-1 GitHub Actions ingestion "
        "pipeline. Review before promoting.*",
    )
    return "\n".join(lines)


def main() -> int:
    if len(sys.argv) != 4:
        print(__doc__)
        return 1

    capsules_path = Path(sys.argv[1])
    owner, repo = sys.argv[2], sys.argv[3]

    if not capsules_path.exists():
        print(f"Capsules file not found: {capsules_path}", file=sys.stderr)
        return 1

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("GITHUB_TOKEN is not set.", file=sys.stderr)
        return 1

    capsules = json.loads(capsules_path.read_text(encoding="utf-8"))
    if not capsules:
        print("No capsules to file.")
        return 0

    from github import Github, Auth

    gh = Github(auth=Auth.Token(token))
    gh_repo = gh.get_repo(f"{owner}/{repo}")

    filed = 0
    for capsule in capsules:
        issue = gh_repo.create_issue(
            title=capsule["title"],
            body=build_issue_body(capsule),
            labels=["capsule", "state:draft", f"kind:{capsule['kind']}"],
        )
        print(f"Filed capsule #{issue.number}: {issue.html_url}")
        filed += 1

    print(f"Filed {filed} of {len(capsules)} capsule(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
