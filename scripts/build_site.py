#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Build the static website from an explicit list of public files."""
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from string import Template
from urllib.parse import urlsplit
from xml.etree import ElementTree
import shutil

import mistune

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"

SITE = "https://senyo888.github.io/thermal-intelligence/"
WIKI = "https://github.com/senyo888/thermal-intelligence/wiki/"
# Only these reviewed Wiki sources are published on the website.
GUIDES = {
    "install/": ("Installing-with-Marketplace", "Install the Thermal Intelligence thermostat card through Home Assistant Marketplace."),
    "first-room/": ("Configuration", "Set up your first Thermal Intelligence thermostat in Home Assistant and choose the readings for your room."),
}


class GuideRenderer(mistune.HTMLRenderer):
    def link(self, text, url, title=None):
        for route, (slug, _) in GUIDES.items():
            if url == WIKI + slug:
                url = "../" + route
                break
        return super().link(text, url, title)


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


def public_file(name):
    path = ROOT / name
    if not path.is_file() or path.resolve() != path:
        raise SystemExit(f"Missing or unsafe website source: {name}")
    return path


def render_guides():
    template = Template(public_file("site/guide.html").read_text())
    markdown = mistune.create_markdown(renderer=GuideRenderer(escape=False), plugins=["table"])
    pages = {}
    for route, (slug, description) in GUIDES.items():
        source = public_file(f"docs/wiki/{slug}.md").read_text()
        heading = source.splitlines()[0]
        if not heading.startswith("# "):
            raise SystemExit(f"Expected a guide title in {slug}.md")
        pages[route] = template.substitute(
            title=escape(heading[2:]), description=escape(description), canonical=SITE + route,
            install_current=' aria-current="page"' if route == "install/" else "",
            setup_current=' aria-current="page"' if route == "first-room/" else "",
            article=markdown(source),
        )
    return pages


def main():
    parser = Links()
    parser.feed(public_file("site/index.html").read_text())
    guides = render_guides()
    if not guides.keys() <= parser.paths:
        raise SystemExit("Each published guide needs a link from the homepage.")
    sitemap = ElementTree.parse(public_file("site/sitemap.xml"))
    locations = {loc.text for loc in sitemap.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")}
    if locations != {SITE, *(SITE + route for route in guides)}:
        raise SystemExit("Sitemap URLs must match the published pages.")
    files = {f"site/{name}": name for name in ("index.html", "styles.css", "robots.txt", "sitemap.xml")}
    for name in parser.paths:
        if name == "styles.css" or name in guides:
            continue
        path = Path(name)
        if path.parent != Path("assets/presentation") or path.suffix != ".png":
            raise SystemExit(f"Unexpected website path: {name}")
        files[name] = name
    for name in files:
        public_file(name)
    if OUTPUT.is_symlink() or OUTPUT.exists():
        raise SystemExit("_site already exists; choose a clean build directory before rebuilding.")
    OUTPUT.mkdir()
    for source, destination in files.items():
        target = OUTPUT / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / source, target)
    for route, html in guides.items():
        directory = OUTPUT / route
        directory.mkdir()
        (directory / "index.html").write_text(html)
    print(f"Built website: {len(files) + len(guides)} public files. No runtime package or working records included.")


if __name__ == "__main__":
    main()
