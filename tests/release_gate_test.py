#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Release control failures must leave the tag and closeout receipt untouched."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import release_gate as gate
import verify_live_release as live
from check_release_docs import template


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.identity = {"release_commit": "a" * 40, "documentation_commit": "b" * 40}
        record = template(self.identity)
        for name, row in record["reviews"].items():
            row.update(verdict="clear", finding=name + " reviewed the final correction.")
        for row in record["preparation"].values():
            row.update(status="verified", evidence="Checked the exact revision.")
        record["release_title"] = "Thermal Intelligence 1.2.3"
        self.record = record
        self.target = {"operation": "tag", "source": "a" * 40, "docs": "b" * 40, "version": "1.2.3",
                       "note_sha256": "d" * 64, "files": {"module": "e" * 64}}

    def test_each_private_finding_is_required_and_never_exported_as_text(self):
        receipt = gate.attest(self.record, self.identity, self.target)
        gate.validate_attestation(receipt, self.target)
        for role in gate.REVIEWERS:
            with self.subTest(role=role):
                self.assertNotIn(self.record["reviews"][role]["finding"], json.dumps(receipt))
                missing = copy.deepcopy(self.record)
                del missing["reviews"][role]
                with self.assertRaisesRegex(ValueError, role):
                    gate.attest(missing, self.identity, self.target)
                forged = copy.deepcopy(receipt)
                del forged["reviews"][role]
                with self.assertRaises(ValueError):
                    gate.validate_attestation(forged, self.target)

    def test_wrong_revision_phase_version_note_or_package_cannot_reuse_clearance(self):
        receipt = gate.attest(self.record, self.identity, self.target)
        for key, change in {"operation": "closeout", "source": "c" * 40, "docs": "c" * 40,
                            "version": "1.2.4", "note_sha256": "f" * 64, "files": {}}.items():
            with self.subTest(key=key), self.assertRaises(ValueError):
                gate.validate_attestation(receipt, {**self.target, key: change})

    def test_installer_and_other_publication_evidence_required_for_closeout(self):
        for op in ("closeout", "beta-closeout"):
            with self.assertRaisesRegex(ValueError, "installer"):
                gate.attest(self.record, self.identity, {**self.target, "operation": op})

    @patch.object(gate, "api")
    def test_rules_reject_other_creators_deletions_and_unattested_drift(self, api):
        actor = {"actor_id": 17, "actor_type": "Integration", "bypass_mode": "always"}
        policies = [
            {"id": i, "target": "tag", "enforcement": "active", "updated_at": "revision-1",
             "conditions": {"ref_name": {"include": ["refs/tags/v*"], "exclude": []}},
             "rules": [{"type": kind} for kind in kinds], "bypass_actors": actors}
            for i, kinds, actors in [(1, ["creation"], [actor]), (2, ["update", "deletion"], [])]]
        api.side_effect = lambda path: policies if "?" in path else policies[int(path[-1]) - 1]
        original = gate.check_tag_rules("17")
        policies[0]["bypass_actors"].append({**actor, "actor_id": 18})
        with self.assertRaises(ValueError):
            gate.check_tag_rules("17")
        for row in policies:
            del row["bypass_actors"]
        self.assertEqual(gate.check_tag_rules("17", original), original)
        policies[1]["updated_at"] = "revision-2"
        with self.assertRaises(ValueError):
            gate.check_tag_rules("17", original)

    @patch.dict(gate.os.environ, {"GITHUB_RUN_ID": "42"})
    @patch.object(gate, "api")
    @patch.object(gate, "remote_tag", return_value="0" * 40)
    def test_conflicting_existing_tag_is_never_written(self, _lookup, api):
        with self.assertRaises(ValueError):
            gate.create_tag(gate.attest(self.record, self.identity, self.target))
        api.assert_not_called()

    @patch.dict(gate.os.environ, {"GITHUB_RUN_ID": "42"})
    @patch.object(gate, "tagged_delivery", return_value={"run": "another"})
    @patch.object(gate, "remote_tag", return_value="a" * 40)
    @patch.object(gate, "api")
    def test_existing_same_commit_tag_cannot_acquire_retrospective_approval(self, api, _sha, _delivery):
        with self.assertRaises(ValueError):
            gate.create_tag(gate.attest(self.record, self.identity, self.target))
        api.assert_not_called()

    @patch.dict(gate.os.environ, {"GITHUB_RUN_ID": "42"})
    @patch.object(gate, "api")
    @patch.object(gate, "remote_tag")
    def test_create_and_retry_single_annotated_tag(self, remote, api):
        receipt = gate.attest(self.record, self.identity, self.target)
        store = {}
        def request(path, *options):
            if path == "git/tags":
                store["message"] = next(arg.removeprefix("message=") for arg in options if arg.startswith("message="))
                return {"sha": "f" * 40}
            if path == "git/refs":
                return {}
            if path.startswith("git/ref/"):
                return {"object": {"type": "tag", "sha": "f" * 40}}
            return {"message": store["message"], "tag": "v1.2.3", "object": {"type": "commit", "sha": "a" * 40}}
        api.side_effect = request
        remote.side_effect = [None, "a" * 40, "a" * 40, "a" * 40]
        gate.create_tag(receipt)
        gate.create_tag(receipt)
        self.assertEqual([c.args[0] for c in api.call_args_list].count("git/refs"), 1)

    @patch.dict(gate.os.environ, {"GITHUB_SHA": "f" * 40})
    @patch.object(gate.subprocess, "run")
    @patch.object(gate, "blob")
    @patch.object(gate, "api")
    def test_modified_workflow_and_skipped_jobs_cannot_authorize(self, api, blob, _git):
        run = {"conclusion": "success", "head_sha": self.target["source"], "id": 123, "run_attempt": 2}
        for changed in (True, False):
            blob.side_effect = [b"altered" if changed else b"trusted", b"trusted"]
            api.side_effect = [{"commit": {"sha": "a" * 40}}, {"workflow_runs": [run]},
                               {"jobs": [{"name": "foundation", "conclusion": "success"},
                                         {"name": "frontend", "conclusion": "skipped"}]}]
            with self.assertRaises(ValueError):
                gate.check_candidate({**self.target, "channel": "beta"})

    @patch.object(gate, "api")
    def test_closure_rejects_untrusted_or_unsuccessful_delivery(self, api):
        run = {"repository": {"id": gate.REPO_ID}, "head_branch": "main", "event": "workflow_dispatch",
               "path": ".github/workflows/release-gate.yml", "actor": {"login": "senyo888"}, "conclusion": "success"}
        for change in ({"head_branch": "develop"}, {"event": "pull_request"}, {"conclusion": "failure"},
                       {"path": "another.yml"}, {"repository": {"id": 1}}):
            api.return_value = {**run, **change}
            with self.assertRaises(ValueError):
                gate.approved_delivery({}, "12", Path("."))


class PublicationTests(unittest.TestCase):
    def test_missing_download_and_corrupt_published_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = b"reviewed contents"
            name = "manifest.json"
            (root / name).write_bytes(data)
            receipt = {"source": "a" * 40, "version": "1.2.3", "files": {name: gate.sha256(data)}}
            with patch.object(live, "release_metadata", return_value={"assets": []}), self.assertRaises(ValueError):
                live.downloads(receipt, root)
            asset = {"name": name, "state": "uploaded", "browser_download_url": gate.WEB + "/releases/download/v1.2.3/" + name,
                     "size": len(data), "digest": "sha256:" + gate.sha256(data)}
            with patch.object(live, "release_metadata", return_value={"assets": [asset]}), \
                    patch.object(live, "get", return_value=(b"different", "")), self.assertRaises(ValueError):
                live.downloads(receipt, root)

    def test_wiki_chrome_requires_correct_visible_region_text_and_destination(self):
        source = '<p><a href="/guide">Installation guide</a></p>'
        good = '<div id="wiki-footer">' + source + '</div>'
        live.rendered(source, good.encode(), "wiki-footer", gate.WEB)
        for changed in (good.replace("wiki-footer", "wiki-body"), good.replace("/guide", "/old"),
                        good.replace("Installation", "Historical"), good.replace("Installation", "Never use this Installation")):
            with self.assertRaises(ValueError):
                live.rendered(source, changed.encode(), "wiki-footer", gate.WEB)

    def test_swapped_visible_link_labels_fail(self):
        source = '<p><a href="/stable">Stable</a> <a href="/old">Historical</a></p>'
        changed = source.replace("/stable", "/temp").replace("/old", "/stable").replace("/temp", "/old")
        with self.assertRaises(ValueError):
            live.rendered(source, ('<div id="wiki-body">' + changed + '</div>').encode(), "wiki-body", gate.WEB)

    def test_reversed_temperature_comparison_fails_but_whitespace_can_change(self):
        source = "<p>Act when temperature &lt; 20.</p>"
        page = b'<div id="wiki-body">Act when temperature\n  &lt;   20.</div>'
        live.rendered(source, page, "wiki-body", gate.WEB)
        with self.assertRaisesRegex(ValueError, "reviewed text"):
            live.rendered(source, page.replace(b"&lt;", b"&gt;"), "wiki-body", gate.WEB)

    def test_each_download_link_must_stay_with_its_release_channel(self):
        section = '<p>Stable: <a href="{}">Download</a></p><p>Beta: <a href="{}">Download</a></p>'
        source = section.format("/stable", "/beta")
        page = '<div id="wiki-body">{}</div>'
        live.rendered(source, page.format(source).encode(), "wiki-body", gate.WEB)
        swapped = section.format("/beta", "/stable")
        with self.assertRaisesRegex(ValueError, "destination"):
            live.rendered(source, page.format(swapped).encode(), "wiki-body", gate.WEB)

    @patch.object(live, "get", side_effect=lambda url: (b"right" if "?" in url else b"stale", url))
    def test_cache_busted_bytes_cannot_certify_the_canonical_url(self, _get):
        with self.assertRaises(ValueError):
            live.compare_bytes(gate.WEB, b"right")

    @patch.object(live, "public_stable", return_value={"tag": "v1.3.0", "source": "c" * 40})
    @patch.object(live, "api", side_effect=[{"commit": {"sha": "b" * 40}}, {"tag_name": "v1.3.0"}])
    def test_prerelease_cannot_close_against_an_unreviewed_stable(self, _api, _stable):
        with self.assertRaisesRegex(ValueError, "stable identity"):
            live.verify_live({"source": "a" * 40, "docs": "b" * 40, "channel": "beta",
                              "public_stable": {"tag": "v1.2.0", "source": "d" * 40}}, Path("."))

    @patch.object(live, "api", return_value={"commit": {"sha": "c" * 40}})
    def test_main_drift_blocks_before_closeout(self, _api):
        with self.assertRaisesRegex(ValueError, "main"):
            live.verify_live({"source": "a" * 40, "docs": "b" * 40}, Path("."))


if __name__ == "__main__":
    unittest.main()
