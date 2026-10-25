# SPDX-License-Identifier: GPL-3.0-only
"""Exercise immutable source selection, determinism and invalid-package rejection."""
import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("package_beta", Path(__file__).resolve().parents[1] / "scripts/package_beta.py")
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

    def test_mismatched_bundle_rejected(self):
        Path("dist/thermal-intelligence.js").write_text("old module"); self.commit()
        with self.assertRaises(ValueError): module.package("HEAD", "a")

    def test_symlink_rejected(self):
        Path("dist/thermal-intelligence.js").unlink()
        Path("dist/thermal-intelligence.js").symlink_to("../LICENSE"); self.commit()
        with self.assertRaises(ValueError): module.package("HEAD", "a")


if __name__ == "__main__": unittest.main()
