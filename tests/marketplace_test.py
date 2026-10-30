# SPDX-License-Identifier: GPL-3.0-only
"""Guard the TI install surface; no network, Home Assistant or installer calls."""
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from check_marketplace import EXPECTED_MANIFEST, validate


class MarketplaceTests(unittest.TestCase):
    def setUp(self):
        self.files = {
            "hacs.json": json.dumps(EXPECTED_MANIFEST).encode(),
            "package.json": b'{"version":"0.1.0-rc.1"}',
            "LICENSE": b"Fixture licence",
            "dist/LICENSE": b"Fixture licence",
            "dist/thermal-intelligence.js": b"0.1.0-rc.1 thermal-intelligence-beta-card thermal-intelligence-beta-card-editor",
        }

    def check(self):
        return validate(self.files.__getitem__, set(self.files))

    def test_valid_layout_has_no_runtime_claim(self):
        result = self.check()
        self.assertEqual(result['category'], 'plugin')
        self.assertIn('installation, migration and catalogue inclusion unverified', result['scope'])

    def test_installer_options_cannot_silently_change(self):
        for field, value in [('content_in_root', True), ('filename', '../card.js'),
                             ('hide_default_branch', False), ('zip_release', True),
                             ('homeassistant', '2020.1.0'), ('content_in_root', 0),
                             ('hide_default_branch', 1)]:
            with self.subTest(field=field, value=value):
                self.files['hacs.json'] = json.dumps({**EXPECTED_MANIFEST, field: value}).encode()
                with self.assertRaises(ValueError): self.check()

    def test_duplicate_manifest_keys_rejected(self):
        self.files['hacs.json'] = b'{"name":"Thermal Intelligence","name":"Other"}'
        with self.assertRaises(ValueError): self.check()

    def test_root_module_cannot_shadow_dist(self):
        self.files['thermal-intelligence.js'] = b'old root module'
        with self.assertRaises(ValueError): self.check()

    def test_extra_dist_source_map_rejected(self):
        self.files['dist/thermal-intelligence.js.map'] = b'{}'
        with self.assertRaises(ValueError): self.check()

    def test_licence_drift_rejected(self):
        self.files['dist/LICENSE'] = b'outdated licence'
        with self.assertRaises(ValueError): self.check()

    def test_mismatched_version_rejected(self):
        self.files['package.json'] = b'{"version":"0.1.0-rc.2"}'
        with self.assertRaises(ValueError): self.check()

    def test_embedded_source_map_rejected(self):
        self.files['dist/thermal-intelligence.js'] += b'\n//# sourceMappingURL=private.map'
        with self.assertRaises(ValueError): self.check()


if __name__ == '__main__':
    unittest.main()
