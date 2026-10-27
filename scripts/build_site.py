#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Build the static website from an explicit list of public files."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key not in {"src", "href"} or not value:
                continue
            target = urlsplit(value)
            if not target.scheme and not target.netloc and target.path:
                self.paths.add(target.path)


def main():
    parser = Links()
    parser.feed((ROOT / "site/index.html").read_text())
    files = {f"site/{name}": name for name in ("index.html", "styles.css", "robots.txt", "sitemap.xml")}
    for name in parser.paths:
        if name == "styles.css":
            continue
        path = Path(name)
        if path.parent != Path("assets/presentation") or path.suffix != ".png":
            raise SystemExit(f"Unexpected website path: {name}")
        files[name] = name
    for name in files:
        source = ROOT / name
        if source.is_symlink() or not source.is_file():
            raise SystemExit(f"Missing or unsafe website source: {name}")
    if OUTPUT.is_symlink() or OUTPUT.exists():
        raise SystemExit("_site already exists; choose a clean build directory before rebuilding.")
    OUTPUT.mkdir()
    for source, destination in files.items():
        target = OUTPUT / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / source, target)
    print(f"Built website: {len(files)} public files. No runtime package or working records included.")


if __name__ == "__main__":
    main()
