#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Read live Thermal Intelligence publication surfaces and compare them to reviewed Git objects."""
import argparse
import json
import re
import subprocess
import tempfile
import time
import unicodedata
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, urljoin, urlsplit
from urllib.request import Request, urlopen
from xml.etree import ElementTree

import mistune

import build_site
from release_gate import REPO, WEB, api, blob, checked_sha, public_stable, remote_tag, require, sha256, target

RAW = "https://raw.githubusercontent.com/" + REPO
WIKI = WEB + "/wiki/"
HEADER = "assets/presentation/thermal-intelligence-header.png"
VOID = set("area base br col embed hr img input link meta param source track wbr".split())


def get(url):
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "TI-release-verification", "Cache-Control": "no-cache"})
            with urlopen(request, timeout=30) as result:
                return result.read(), result.url
        except OSError:
            if attempt == 2:
                raise
            time.sleep(1 + attempt)


def compare_bytes(url, expected):
    observed, _ = get(url)
    if observed != expected:
        # Only the canonical URL can establish what an ordinary visitor receives.
        observed, _ = get(url)
    require(observed == expected, "Published bytes differ at " + url)
    return sha256(observed)


class Region(HTMLParser):
    """Read the visible text and destinations of a named GitHub Markdown region."""
    def __init__(self, selector=None):
        super().__init__()
        self.selector = selector
        self.stack = []
        self.tokens = []
        self.bindings = []
        self.anchor = None
        self.images = set()
        self.found = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        matched = (self.selector is None or attrs.get("id") == self.selector
                   or self.selector in attrs.get("class", "").split())
        self.found |= matched
        active = matched or bool(self.stack and self.stack[-1][1])
        if self.selector == "wiki-body" and attrs.get("id") == "wiki-footer":
            active = False
        if tag not in VOID:
            self.stack.append((tag, active))
        if active and tag == "a" and attrs.get("href"):
            self.anchor = (attrs["href"], [])
        if active and tag == "img":
            self.images.add(attrs.get("data-canonical-src") or attrs.get("src"))
            if self.anchor:
                self.anchor[1].append(attrs.get("alt", ""))

    def handle_endtag(self, tag):
        if tag == "a" and self.anchor:
            href, text = self.anchor
            label = " ".join(" ".join(text).split())
            if label:
                self.bindings.append((len(self.tokens), label, href))
            self.anchor = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, value):
        if self.stack and self.stack[-1][1]:
            value_normalized = unicodedata.normalize("NFKC", value).casefold()
            self.tokens.extend(re.findall(r"\w+|[^\w\s]", value_normalized))
            if self.anchor:
                self.anchor[1].append(value)

    def destinations(self, base):
        # GitHub adds links around some images. Check each reviewed link at its
        # text position and retain the order of image-only links sharing a label.
        destinations = defaultdict(list)
        for position, label, href in self.bindings:
            destinations[position, label].append(urljoin(base, href))
        return destinations


def rendered(source_html, live_html, selector, url, readme=False):
    expected, actual = Region(), Region(selector)
    expected.feed(source_html)
    actual.feed(live_html.decode())
    require(actual.found and expected.tokens and expected.tokens == actual.tokens,
            "Missing reviewed text in " + url + " (" + selector + ")")
    link_base = WEB + "/blob/main/" if readme else url
    image_base = WEB + "/raw/main/" if readme else url
    present = actual.destinations(url)
    for binding, destinations in expected.destinations(link_base).items():
        require(present.get(binding) == destinations, "Wrong rendered destination for " + binding[1] + " at " + url)
    images = {urljoin(url, href) for href in actual.images if href}
    require(all(urljoin(image_base, href) in images for href in expected.images if href),
            "Missing reviewed image at " + url)


def release_metadata(receipt):
    tag = "v" + receipt["version"]
    require(remote_tag(tag) == receipt["source"], "Remote tag differs from the reviewed package")
    release = api("releases/tags/" + tag)
    require(release["tag_name"] == tag and not release["draft"] and release["published_at"]
            and release["prerelease"] == (receipt["channel"] != "stable"), "Release identity or visibility differs")
    require(release["name"] == receipt["title"], "Published release title differs")
    require(sha256(release["body"].encode()) == receipt["note_sha256"], "Published release note differs")
    return release


def check_presentation(release, receipt):
    url = WEB + "/releases/tag/v" + receipt["version"]
    page, _ = get(url)
    markdown = mistune.create_markdown(escape=False, plugins=["table", "strikethrough"])
    body = markdown(release["body"])
    rendered(body, page, "markdown-body", url)
    headings = re.findall(r"<h1\b[^>]*>([^<]*)</h1>", page.decode())
    require(receipt["title"] in [unescape(title.strip()) for title in headings], "Release page title differs")
    contents = Region()
    contents.feed(body)
    art = [image for image in contents.images if image and image.startswith(RAW + "/")]
    require(art, "Missing repository release artwork")
    for image in art:
        revision, sep, path = image.removeprefix(RAW + "/").partition("/")
        require(sep and path.startswith("assets/presentation/"), "Unexpected release artwork location")
        compare_bytes(image, blob(checked_sha(revision), path))
    migrations = [href for _, _, href in contents.bindings if urlsplit(href).path.endswith("/docs/migration.md")]
    require(migrations, "Missing release migration guide")
    for guide in migrations:
        require(guide.startswith(WEB + "/blob/"), "Migration link must resolve in the TI repository")
        parsed = urlsplit(guide)
        response, final = get(guide)
        require(urlsplit(final).path == parsed.path, "Migration guide was redirected")
        if parsed.fragment:
            require(('id="' + parsed.fragment + '"').encode() in response
                    or ('id="user-content-' + parsed.fragment + '"').encode() in response,
                    "Migration guide anchor is missing")


def downloads(receipt, assets):
    release = release_metadata(receipt)
    rows = release["assets"]
    require(sorted(a["name"] for a in rows) == sorted(receipt["files"]), "Unexpected release download inventory")
    for asset in rows:
        name = asset["name"]
        data = (assets / name).read_bytes()
        url = WEB + "/releases/download/v" + receipt["version"] + "/" + name
        require(asset["state"] == "uploaded" and asset["browser_download_url"] == url
                and asset["size"] == len(data) and asset["digest"] == "sha256:" + sha256(data),
                "Incorrect release download metadata for " + name)
        compare_bytes(url, data)
    check_presentation(release, receipt)
    return release


def check_wiki(docs, temp):
    wiki = temp / "wiki.git"
    subprocess.run(["git", "clone", "--bare", "--quiet", "--depth=1", WEB + ".wiki.git", str(wiki)], check=True)
    def host_ref(ref):
        return subprocess.check_output(["git", "-C", str(wiki), "rev-parse", ref], text=True).strip()
    reviewed = subprocess.check_output(["git", "rev-parse", docs + ":docs/wiki"], text=True).strip()
    require(host_ref("HEAD^{tree}") == reviewed, "Hosted Wiki tree differs from docs/wiki")
    wiki_head = host_ref("HEAD")
    names = subprocess.check_output(["git", "ls-tree", "-rz", "--name-only", reviewed]).decode().split("\0")[:-1]
    require({"Home.md", "_Sidebar.md", "_Footer.md"} <= set(names), "Wiki navigation is incomplete")

    def page(name):
        data = blob(docs, "docs/wiki/" + name)
        compare_bytes("https://raw.githubusercontent.com/wiki/" + REPO + "/" + quote(name), data)
        if not name.endswith(".md"):
            return
        slug = name[:-3]
        selector = {"_Sidebar": "wiki-custom-sidebar", "_Footer": "wiki-footer"}.get(slug, "wiki-body")
        url = WIKI + ("Home" if selector != "wiki-body" else quote(slug))
        html, _ = get(url)
        markdown = mistune.create_markdown(escape=False, plugins=["table", "strikethrough"])
        rendered(markdown(data.decode()), html, selector, url)

    with ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(page, names))
    return {"commit": wiki_head, "files": len(names)}


def pages_deployment(docs):
    deployments = api("deployments?environment=github-pages&per_page=1")
    require(deployments, "Missing Pages deployment")
    deployment = deployments[0]
    statuses = api(f"deployments/{deployment['id']}/statuses?per_page=1")
    require(statuses and statuses[0]["state"] == "success", "Latest Pages deployment has not succeeded")
    # A documentation-only main commit can leave an earlier deployment serving identical bytes.
    subprocess.run(["git", "merge-base", "--is-ancestor", checked_sha(deployment["sha"]), docs], check=True)
    return {"id": deployment["id"], "commit": deployment["sha"]}


def check_site(docs, temp):
    deployment = pages_deployment(docs)
    root = (temp / "site-source").resolve()
    subprocess.run(["git", "worktree", "add", "--quiet", "--detach", str(root), docs], check=True)
    try:
        build_site.ROOT, build_site.OUTPUT = root, temp / "rendered-site"
        build_site.main()
        files = sorted(p for p in build_site.OUTPUT.rglob("*") if p.is_file())

        def check(path):
            name = path.relative_to(build_site.OUTPUT).as_posix()
            url = build_site.SITE + name.removesuffix("index.html") if path.name == "index.html" else build_site.SITE + name
            compare_bytes(url, path.read_bytes())
            return url

        with ThreadPoolExecutor(max_workers=6) as pool:
            urls = list(pool.map(check, files))
        return {**deployment, "files": len(urls), "routes": [url for url in urls if url.endswith("/")]}
    finally:
        subprocess.run(["git", "worktree", "remove", str(root)], check=True)


def check_readme(docs, latest):
    source = blob(docs, "README.md")
    compare_bytes(RAW + "/main/README.md", source)
    html = subprocess.check_output(["gh", "api", "-H", "Accept: application/vnd.github.html+json",
                                   "repos/" + REPO + "/readme?ref=" + docs]).decode()
    page, _ = get(WEB)
    rendered(html, page, "markdown-body", WEB, readme=True)
    require(HEADER in html and HEADER.encode() in page, "Original README brand header is missing")
    compare_bytes(RAW + "/main/" + HEADER, blob(docs, HEADER))
    latest_url = WEB + "/releases/latest"
    require(get(latest_url)[1].rstrip("/") == WEB + "/releases/tag/" + latest, "Latest release link differs")
    manifest_url = latest_url + "/download/manifest.json"
    stable = json.loads(get(manifest_url)[0])
    require("v" + stable["version"] == latest and stable["source_commit"] == remote_tag(latest),
            "Latest published manifest differs from the stable tag")
    badges = {
        "Latest published release": (latest_url, "Release: " + latest),
        "Latest published package manifest version": (manifest_url, "Manifest: " + stable["version"]),
    }
    for name, (destination, label) in badges.items():
        match = re.search(r"\[!\[" + re.escape(name) + r"\]\(([^)]+)\)\]\(([^)]+)\)", source.decode())
        require(match and match[2] == destination and urlsplit(match[1]).netloc == "img.shields.io"
                and urlsplit(match[1]).scheme == "https" and destination.encode() in page,
                "Missing published badge or incorrect destination for " + name)
        require(ElementTree.fromstring(get(match[1])[0]).get("aria-label") == label, "Stale badge for " + name)
    return {"sha256": sha256(source), "stable_badges": latest}


def verify_live(receipt, assets, delivery=None):
    source, docs = receipt["source"], receipt["docs"]
    def main_head():
        return api("branches/main")["commit"]["sha"]
    require(main_head() == docs, "Live main differs from reviewed documentation")
    latest = api("releases/latest")["tag_name"]
    if receipt["channel"] != "stable":
        require(public_stable() == receipt["public_stable"], "Reviewed public stable identity changed")
    if receipt["channel"] == "stable":
        require(latest == "v" + receipt["version"], "Approved stable version is not the published latest release")
    with tempfile.TemporaryDirectory() as directory:
        temp = Path(directory)
        if receipt["operation"] == "beta-closeout":
            require(remote_tag("v" + receipt["version"]) is None, "Distributed beta already has a release tag")
            for name in ("thermal-intelligence.js", "LICENSE"):
                compare_bytes(RAW + "/" + source + "/dist/" + name, (assets / name).read_bytes())
            public = delivery / "package"
            require({p.name: sha256(p.read_bytes()) for p in public.iterdir()} == receipt["files"],
                    "Distributed beta downloads differ from the package")
            require(api("compare/" + source + "...senyo888-patch-1")["status"] in {"identical", "ahead"},
                    "Beta source differs from its published branch history")
            release = None
        else:
            release = downloads(receipt, assets)
        readme = check_readme(docs, latest)
        wiki = check_wiki(docs, temp)
        site = check_site(docs, temp)
        ref = subprocess.check_output(["git", "ls-remote", WEB + ".wiki.git", "HEAD"], text=True).split()[0]
        require(ref == wiki["commit"] and main_head() == docs and api("releases/latest")["tag_name"] == latest
                and pages_deployment(docs)["id"] == site["id"], "Public revisions moved during verification")
        if receipt["channel"] != "stable":
            require(public_stable() == receipt["public_stable"], "Public stable identity changed during verification")
        if release is None:
            require(remote_tag("v" + receipt["version"]) is None, "Beta was tagged during verification")
        if release is not None:
            latest_release = release_metadata(receipt)
            def stamp(row):
                return row["id"], row["updated_at"], sorted(
                    (a["id"], a["name"], a["size"], a["digest"], a["updated_at"]) for a in row["assets"])
            require(stamp(latest_release) == stamp(release), "Release assets or presentation changed during verification")
        return {"source": source, "documentation": docs, "version": receipt["version"], "release_id": release["id"] if release else None,
                "downloads": receipt["files"], "readme": readme, "wiki": wiki, "website": site,
                "observed_at": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Read-only rehearsal of a published tagged release")
    for name in ("source", "docs", "note", "title"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as directory:
        assets = Path(directory) / "package"
        _, receipt = target(args.source, args.docs, args.note, "closeout", assets)
        receipt["title"] = args.title
        if receipt["channel"] != "stable":
            receipt["public_stable"] = public_stable()
        print(json.dumps(verify_live(receipt, assets), indent=2))
