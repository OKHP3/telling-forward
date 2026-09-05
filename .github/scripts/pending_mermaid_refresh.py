"""Read-only gate: retain an existing refresh PR instead of creating a duplicate."""
import json
import re
import subprocess
import sys


def has_pending(pages, repository):
    if not isinstance(pages, list) or not pages:
        raise ValueError("Missing pull request inventory")
    for page in pages:
        if not isinstance(page, list):
            raise ValueError("Invalid pull request page")
        for pr in page:
            # Missing identity is a coverage failure, never permission to push.
            if pr["state"] != "open" or pr["base"]["ref"] != "main":
                raise ValueError("Unexpected pull request scope")
            if pr["base"]["repo"]["full_name"].lower() != repository.lower():
                raise ValueError("Unexpected base repository")
            head = pr["head"]
            if (head["ref"].startswith("automation/refresh-mermaid-")
                    and head["repo"] is not None
                    and head["repo"]["full_name"].lower() == repository.lower()):
                return True
    return False


def main(repository):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Invalid repository identity")
    result = subprocess.run(
        ["gh", "api", "--method", "GET", "--paginate", "--slurp",
         f"repos/{repository}/pulls?state=open&base=main&per_page=100"],
        capture_output=True, text=True, timeout=120, check=False,
    )
    if result.returncode:
        raise RuntimeError("Pull request inventory failed; no refresh authorized")
    print("true" if has_pending(json.loads(result.stdout), repository) else "false")


if __name__ == "__main__":
    main(sys.argv[1])
