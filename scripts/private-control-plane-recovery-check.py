"""Prove the private-control-plane recovery and access boundary.

This uses synthetic records and the same source-of-truth classes as the
application. It intentionally does not connect to production or emit real
credentials. A live encrypted PostgreSQL restore remains an operator task.
"""

from __future__ import annotations

import copy
import json
import tempfile
from pathlib import Path


PRIVATE_CLASSES = {
    "identity",
    "consent",
    "moderation",
    "audit",
    "ephemeral_security",
}
CREATIVE_CLASSES = {"creative", "provenance"}


def fixture() -> dict[str, list[dict[str, object]]]:
    return {
        "creative": [{"commit_sha": "abc123", "title": "A private scene"}],
        "provenance": [{"commit_sha": "abc123", "decision": "accepted-into-canon"}],
        "identity": [{"user_id": 7, "display_name": "Fixture Contributor"}],
        "consent": [{"user_id": 7, "action": "submit-branch", "status": "revoked"}],
        "moderation": [{"case_id": "case-1", "private_note": "fixture note"}],
        "audit": [{"event": "consent-revoked", "request_id": "req-1"}],
        "ephemeral_security": [
            {"session": "never-export-this", "reset_token": "never-export-this"}
        ],
    }


def operational_export(records: dict[str, list[dict[str, object]]]) -> dict:
    exported = {}
    for record_class in PRIVATE_CLASSES:
        rows = copy.deepcopy(records[record_class])
        if record_class == "ephemeral_security":
            # Runtime secrets are invalidated rather than recovered.
            rows = []
        exported[record_class] = rows
    return {"format": "private-control-plane-v1", "records": exported}


def restore_clean(export: dict) -> dict[str, list[dict[str, object]]]:
    assert export["format"] == "private-control-plane-v1"
    restored = copy.deepcopy(export["records"])
    assert restored["identity"] and restored["consent"]
    assert restored["moderation"] and restored["audit"]
    assert restored["ephemeral_security"] == []
    return restored


def view_for(role: str, restored: dict[str, list[dict[str, object]]]) -> dict:
    if role == "steward":
        return restored
    if role in {"reader", "unrelated-contributor", "affected-contributor"}:
        # Product-facing views may expose safe story/proposal data, never the
        # private control plane. Consent subject access is a separate future
        # workflow and is intentionally not implied here.
        return {"creative": [], "provenance": []}
    raise ValueError(f"unknown role: {role}")


def github_index_rebuild(records: dict[str, list[dict[str, object]]]) -> dict:
    return {
        record_class: copy.deepcopy(records[record_class])
        for record_class in CREATIVE_CLASSES
    }


def main() -> None:
    source = fixture()
    export = operational_export(source)
    serialized = json.dumps(export)
    assert "never-export-this" not in serialized

    with tempfile.TemporaryDirectory(prefix="control-plane-restore-") as temp:
        archive = Path(temp) / "private-control-plane.json"
        archive.write_text(serialized, encoding="utf-8")
        restored = restore_clean(json.loads(archive.read_text(encoding="utf-8")))

    assert view_for("steward", restored)["moderation"][0]["private_note"]
    for role in ("reader", "unrelated-contributor", "affected-contributor"):
        assert view_for(role, restored).get("moderation") is None
        assert view_for(role, restored).get("consent") is None

    rebuilt = github_index_rebuild(source)
    assert set(rebuilt) == CREATIVE_CLASSES
    assert not (set(rebuilt) & PRIVATE_CLASSES)
    assert "private_note" not in json.dumps(rebuilt)

    print("private control-plane recovery contract: PASS")
    print("restored classes:", ", ".join(sorted(restored)))
    print("GitHub/index rebuild classes:", ", ".join(sorted(rebuilt)))


if __name__ == "__main__":
    main()