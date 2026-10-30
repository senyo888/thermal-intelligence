# SPDX-License-Identifier: GPL-3.0-only
"""Exercise immutable source selection, determinism and invalid-package rejection."""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("package_beta", SCRIPTS / "package_beta.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.before = Path.cwd()
        os.chdir(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        Path("dist").mkdir()
        Path("package.json").write_text(json.dumps({"version": "0.1.0-beta.1"}))
        Path("LICENSE").write_text("Fixture licence")
        Path("dist/thermal-intelligence.js").write_text("0.1.0-beta.1 thermal-intelligence-beta-card thermal-intelligence-beta-card-editor")
        self.commit()

    def tearDown(self):
        os.chdir(self.before)
        self.temp.cleanup()

    def git(self, *args):
        return subprocess.check_output(["git", *args], stderr=subprocess.DEVNULL)

    def commit(self):
        self.git("add", ".")
        self.git("commit", "-qm", "Fixture")

    def test_immutable_and_reproducible(self):
        original = Path("dist/thermal-intelligence.js").read_bytes()
        Path("dist/thermal-intelligence.js").write_text("uncommitted bytes must not be shipped")
        a = module.package("HEAD", "a")
        b = module.package("HEAD", "b")
        self.assertEqual(a, b)
        self.assertEqual((a["channel"], a["delivery_branch"]), ("beta", "senyo888-patch-1"))
        self.assertEqual(Path("a/thermal-intelligence.js").read_bytes(), original)
        self.assertEqual(sorted(p.name for p in Path("a").iterdir()), ["LICENSE", "manifest.json", "thermal-intelligence.js"])
        for p in Path("a").iterdir():
            self.assertEqual(p.read_bytes(), (Path("b") / p.name).read_bytes())

    def test_existing_destination_rejected(self):
        Path("existing").mkdir()
        with self.assertRaises(FileExistsError): module.package("HEAD", "existing")

    def test_non_beta_rejected(self):
        Path("package.json").write_text(json.dumps({"version": "1.0.0"})); self.commit()
        with self.assertRaises(ValueError): module.package("HEAD", "a")

    def test_rc_routes_to_develop_without_changing_card_type(self):
        Path("package.json").write_text(json.dumps({"version": "0.1.0-rc.1"}))
        bundle = Path("dist/thermal-intelligence.js")
        bundle.write_text(bundle.read_text().replace("0.1.0-beta.1", "0.1.0-rc.1"))
        self.commit()
        manifest = module.package("HEAD", "a")
        self.assertEqual((manifest["channel"], manifest["delivery_branch"]), ("rc", "develop"))
        self.assertEqual(manifest["card_type"], "custom:thermal-intelligence-beta-card")
        self.assertEqual(manifest["source_commit"], self.git("rev-parse", "HEAD").decode().strip())
        self.assertEqual(manifest, module.package("HEAD", "b"))

    def test_invalid_prerelease_versions_rejected(self):
        for version in ["0.1.0-rc.0", "0.1.0-rc.01", "0.1.0-RC.1", "0.1.0-alpha.1", "0.1.0-rc.1+local", "01.1.0-beta.1"]:
            with self.subTest(version=version):
                Path("package.json").write_text(json.dumps({"version": version}))
                self.commit()
                with self.assertRaises(ValueError): module.package("HEAD", "a")

    def test_rc_metadata_cannot_ship_beta_bundle(self):
        Path("package.json").write_text(json.dumps({"version": "0.1.0-rc.1"})); self.commit()
        with self.assertRaises(ValueError): module.package("HEAD", "a")

    def test_mismatched_bundle_rejected(self):
        Path("dist/thermal-intelligence.js").write_text("old module"); self.commit()
        with self.assertRaises(ValueError): module.package("HEAD", "a")

    def test_symlink_rejected(self):
        Path("dist/thermal-intelligence.js").unlink()
        Path("dist/thermal-intelligence.js").symlink_to("../LICENSE"); self.commit()
        with self.assertRaises(ValueError): module.package("HEAD", "a")

    def marketplace_files(self):
        from check_marketplace import EXPECTED_MANIFEST
        Path("hacs.json").write_text(json.dumps(EXPECTED_MANIFEST))
        Path("dist/LICENSE").write_bytes(Path("LICENSE").read_bytes())
        self.commit()

    def test_marketplace_package_requires_committed_metadata(self):
        from check_marketplace import EXPECTED_MANIFEST
        Path("hacs.json").write_text(json.dumps(EXPECTED_MANIFEST))
        Path("dist/LICENSE").write_bytes(Path("LICENSE").read_bytes())
        with self.assertRaises(ValueError): module.package_marketplace("HEAD", "a")
        self.assertFalse(Path("a").exists())

    def test_marketplace_package_is_immutable_and_reproducible(self):
        self.marketplace_files()
        Path("hacs.json").write_text('{"name":"uncommitted"}')
        Path("dist/LICENSE").write_text("uncommitted licence")
        a = module.package_marketplace("HEAD", "a")
        b = module.package_marketplace("HEAD", "b")
        self.assertEqual(a, b)
        self.assertEqual(a["distribution"]["repository_manifest"]["filename"], "thermal-intelligence.js")
        self.assertEqual(a["distribution"]["source"], a["source_commit"])
        self.assertEqual(sorted(p.name for p in Path("a").iterdir()), ["LICENSE", "manifest.json", "thermal-intelligence.js"])
        for p in Path("a").iterdir():
            self.assertEqual(p.read_bytes(), (Path("b") / p.name).read_bytes())

    def test_marketplace_rejects_stray_dist_payload(self):
        self.marketplace_files()
        Path("dist/notes.txt").write_text("Not an installation file"); self.commit()
        with self.assertRaises(ValueError): module.package_marketplace("HEAD", "a")
        self.assertFalse(Path("a").exists())

    def test_marketplace_rejects_symlink_metadata(self):
        self.marketplace_files()
        Path("hacs.json").unlink(); Path("hacs.json").symlink_to("package.json"); self.commit()
        with self.assertRaises(ValueError): module.package_marketplace("HEAD", "a")

    def test_marketplace_rejects_missing_licence(self):
        self.marketplace_files()
        Path("dist/LICENSE").unlink(); self.commit()
        with self.assertRaises(ValueError): module.package_marketplace("HEAD", "a")


if __name__ == "__main__": unittest.main()
