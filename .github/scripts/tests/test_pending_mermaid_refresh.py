import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import subprocess

spec = importlib.util.spec_from_file_location("gate", Path(__file__).resolve().parents[1] / "pending_mermaid_refresh.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
REPO = "OKHP3/telling-forward"


def pr(branch="automation/refresh-mermaid-123", head_repo=REPO):
    return {"state": "open", "base": {"ref": "main", "repo": {"full_name": REPO}},
            "head": {"ref": branch, "repo": {"full_name": head_repo}}}


class GateTests(unittest.TestCase):
    def test_existing_refresh_blocks_another(self):
        self.assertTrue(gate.has_pending([[pr()]], REPO))

    def test_later_page_is_checked(self):
        self.assertTrue(gate.has_pending([[pr("unrelated")], [pr()]], REPO))

    def test_empty_complete_inventory_allows_refresh(self):
        self.assertFalse(gate.has_pending([[]], REPO))

    def test_unrelated_or_fork_does_not_claim_owned_branch(self):
        self.assertFalse(gate.has_pending([[pr("unrelated"), pr(head_repo="other/fork")]], REPO))

    def test_missing_or_wrong_scope_fails_closed(self):
        for pages in ([], {}, [None], [[{}]]):
            with self.assertRaises((ValueError, KeyError, TypeError)):
                gate.has_pending(pages, REPO)
        wrong = pr()
        wrong["base"]["ref"] = "other"
        with self.assertRaises(ValueError):
            gate.has_pending([[wrong]], REPO)

    def test_api_failure_does_not_allow_refresh(self):
        with patch.object(gate.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, "", "private error")):
            with self.assertRaisesRegex(RuntimeError, "no refresh authorized"):
                gate.main(REPO)

    def test_api_is_read_only_paginated_and_bounded(self):
        with patch.object(gate.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "[[]]", "")) as run:
            with patch("builtins.print") as output:
                gate.main(REPO)
        output.assert_called_once_with("false")
        self.assertIn("--paginate", run.call_args.args[0])
        self.assertIn("GET", run.call_args.args[0])
        self.assertEqual(run.call_args.kwargs["timeout"], 120)


if __name__ == "__main__":
    unittest.main()
