#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Exercise branch-target boundaries against synthetic indexed Git blobs."""

import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("foundation", ROOT / "scripts/check_foundation.py")
foundation = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(foundation)


class FoundationTargetTests(unittest.TestCase):
    """Candidate changes must not bypass shared checks or weaken main validation."""

    def run_foundation(self, environment, *, changed_payload=True, extra=None, licence=None):
        """Run the public entry point with controlled index contents and CI context."""
        blobs = {
            "dist/thermal-intelligence.js": b"// frozen synthetic module\n",
            "dist/LICENSE": b"synthetic distribution licence\n",
        }
        expected_hashes = {name: hashlib.sha256(data).hexdigest() for name, data in blobs.items()}
        blobs["LICENSE"] = (ROOT / "LICENSE").read_bytes() if licence is None else licence
        blobs["hacs.json"] = json.dumps(foundation.HACS_METADATA).encode() + b"\n"
        if changed_payload:
            blobs["dist/thermal-intelligence.js"] += b"\n// next candidate fixture\n"
        blobs.update(extra or {})

        def git(*args):
            """Serve only the index reads used by the foundation entry point."""
            if args == ("ls-files", "--stage", "-z"):
                return b"".join(f"100644 {'0' * 40} 0\t{name}\0".encode() for name in blobs)
            if len(args) == 2 and args[0] == "show" and args[1].startswith(":"):
                return blobs[args[1][1:]]
            raise AssertionError(f"Unexpected Git call: {args}")

        output = io.StringIO()
        with patch.dict(foundation.os.environ, environment, clear=True), \
                patch.object(foundation, "DISTRIBUTION_HASHES", expected_hashes), \
                patch.object(foundation, "git", side_effect=git), \
                contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            return foundation.main(), output.getvalue()

    def test_main_rejects_changed_snapshot(self):
        """Main pushes and PR bases reject bytes from a later candidate."""
        for environment in [
            {"GITHUB_REF": "refs/heads/main"},
            {"GITHUB_BASE_REF": "main", "GITHUB_REF": "refs/pull/6/merge"},
            {"GITHUB_BASE_REF": "main", "GITHUB_REF": "refs/heads/develop"},
        ]:
            with self.subTest(environment=environment):
                code, output = self.run_foundation(environment)
                self.assertEqual(code, 1)
                self.assertIn("differs from the reviewed RC.1 snapshot", output)

    def test_candidate_pushes_accept_evolving_payload(self):
        """Candidate and beta pushes do not inherit the main payload freeze."""
        for branch in ("develop", "senyo888-patch-1"):
            with self.subTest(branch=branch):
                code, _ = self.run_foundation({"GITHUB_REF": f"refs/heads/{branch}"})
                self.assertEqual(code, 0)

    def test_candidate_pr_base_wins_over_ref(self):
        """The PR destination determines policy despite a synthetic checkout ref."""
        for ref in ("refs/pull/6/merge", "refs/heads/main"):
            with self.subTest(ref=ref):
                code, _ = self.run_foundation({"GITHUB_BASE_REF": "develop", "GITHUB_REF": ref})
                self.assertEqual(code, 0)

    def test_local_unknown_and_tag_contexts_remain_strict(self):
        """Missing or unrecognized targets cannot disable snapshot validation."""
        for environment in [{}, {"GITHUB_REF": "refs/pull/6/merge"},
                            {"GITHUB_REF": "refs/tags/develop"},
                            {"GITHUB_BASE_REF": "unexpected"}]:
            with self.subTest(environment=environment):
                code, output = self.run_foundation(environment)
                self.assertEqual(code, 1)
                self.assertIn("differs from the reviewed RC.1 snapshot", output)

    def test_exact_main_snapshot_passes(self):
        """The approved snapshot remains acceptable on main."""
        code, _ = self.run_foundation({"GITHUB_REF": "refs/heads/main"}, changed_payload=False)
        self.assertEqual(code, 0)

    def test_candidate_still_rejects_private_files(self):
        """Candidate routing never disables the shared private-file boundary."""
        code, output = self.run_foundation({"GITHUB_BASE_REF": "develop"},
                                           extra={".private/example.txt": b"synthetic fixture\n"})
        self.assertEqual(code, 1)
        self.assertIn("private operational file", output)

    def test_candidate_still_rejects_changed_licence(self):
        """The public licence check applies independently of snapshot policy."""
        code, output = self.run_foundation({"GITHUB_REF": "refs/heads/develop"},
                                           licence=b"changed fixture\n")
        self.assertEqual(code, 1)
        self.assertIn("approved standard GPL-3.0 text", output)


if __name__ == "__main__":
    unittest.main()
