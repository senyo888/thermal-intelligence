#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Exercise internal link validation for the published website."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_site import Links, SITE, validate_links


class SiteLinkTests(unittest.TestCase):
    def check_link(self, url):
        home = Links()
        home.feed('<main id="main"></main>')
        guide = Links()
        guide.feed('<h1 id="install">Installation</h1>')
        guide.urls.add(url)
        validate_links({SITE: home, SITE + "install/": guide}, ["styles.css", "index.html"])

    def test_queries_preserve_destination_checks(self):
        self.check_link("../styles.css?v=1")
        with self.assertRaisesRegex(SystemExit, "missing site destination"):
            self.check_link("../missing.css?v=1")

    def test_homepage_fragments_with_either_address(self):
        for home in ["../", "../index.html"]:
            with self.subTest(home=home):
                self.check_link(home + "?v=1#main")
                with self.assertRaisesRegex(SystemExit, "missing site anchor"):
                    self.check_link(home + "?v=1#missing-section")

    def test_guide_index_uses_its_own_headings(self):
        self.check_link("index.html#install")
        with self.assertRaisesRegex(SystemExit, "missing site anchor"):
            self.check_link("index.html#main")


if __name__ == "__main__":
    unittest.main()
