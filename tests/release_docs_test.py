#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Regression checks for compulsory release review, offline."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from check_release_docs import is_documentation, template, verification_errors


class ReleaseDocumentationTests(unittest.TestCase):
    def setUp(self):
        self.identity = {"release_commit": "a", "documentation_commit": "b", "files": ["SECURITY.md"]}
        self.record = template(self.identity)
        for entry in self.record["reviews"].values():
            entry.update(verdict="clear", finding="Checked the archived and current routes.")
        for field in self.record["preparation"]:
            self.record["preparation"][field].update(status="verified", evidence="See the candidate inspection record.")

    def test_inventory_includes_indirect_and_new_surfaces(self):
        for path in ["SECURITY.md", "docs/wiki/_Sidebar.md", "docs/new-guide.md", "site/guide.html",
                     "site/sitemap.xml", ".github/ISSUE_TEMPLATE/bug_report.yml", "tests/fixtures/rc-1/README.md"]:
            self.assertTrue(is_documentation(path), path)

    def test_missing_core_or_unresolved_finding_blocks_validation(self):
        self.assertEqual(verification_errors(self.identity, self.record, False), [])
        del self.record["reviews"]["AetherCore"]
        self.assertTrue(verification_errors(self.identity, self.record, False))
        self.record["reviews"]["AetherCore"] = {"verdict": "clear", "finding": "Checked evidence."}
        self.record["open_blockers"].append("Wrong stable version")
        self.assertTrue(verification_errors(self.identity, self.record, False))

    def test_failed_observation_with_evidence_remains_blocking(self):
        self.record["preparation"]["links and anchors"].update(status="failed", evidence="Missing anchor.")
        self.assertTrue(verification_errors(self.identity, self.record, False))

    def test_new_docs_commit_or_changed_inventory_invalidates_record(self):
        for change in [{"documentation_commit": "c"}, {"files": ["SECURITY.md", "docs/new.md"]}]:
            self.assertTrue(verification_errors({**self.identity, **change}, self.record, False))

    def test_preparation_alone_cannot_close_release(self):
        self.assertTrue(verification_errors(self.identity, self.record, True))
        for field in self.record["publication"]:
            self.record["publication"][field].update(status="verified", evidence="Observed on the published version.")
        self.assertEqual(verification_errors(self.identity, self.record, True), [])


if __name__ == "__main__":
    unittest.main()
