#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Inventory the exact release documentation and verify its private review record."""
import argparse
import json
import subprocess
import sys
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree

from package_identity import channel_for


REVIEWERS = ("Bella", "Aetherwing", "Aetherbite", "AetherCore")
PREPARATION = ("stable and candidate identities", "installation and recovery",
               "historical evidence and compatibility", "links and anchors",
               "rendered README, Wiki and website", "release notes, badges and artwork")
PUBLICATION = ("published tag, release notes and assets", "live README and badges",
               "hosted Wiki revision and page parity", "deployed Pages revision and routes",
               "installer results and remaining coverage")


def git(*args):
    return subprocess.check_output(["git", *args], text=True)


def resolve(ref):
    return git("rev-parse", "--verify", "--end-of-options", ref + "^{commit}").strip()


def is_documentation(path):
    name = PurePosixPath(path)
    return (name.suffix.lower() in {".md", ".mdx", ".markdown", ".rst", ".adoc", ".html", ".txt", ".pdf"}
            or path.startswith(("site/", ".github/ISSUE_TEMPLATE/"))
            or name.name in {"LICENSE", "COPYING", "NOTICE"})


def inventory(source, docs):
    source, docs = resolve(source), resolve(docs)
    version = json.loads(git("show", source + ":package.json"))["version"]
    files = sorted(path for path in git("ls-tree", "-rz", "--name-only", docs).split("\0")
                   if path and is_documentation(path))
    sitemap = ElementTree.fromstring(git("show", docs + ":site/sitemap.xml"))
    return {
        "release_commit": source,
        "release_version": version,
        "release_channel": channel_for(version),
        "documentation_commit": docs,
        "files": files,
        "wiki_pages": [p.removeprefix("docs/wiki/") for p in files if p.startswith("docs/wiki/")],
        "website_routes": sorted(loc.text for loc in sitemap.findall("{*}url/{*}loc")),
    }


def template(identity):
    return {
        "inventory": identity,
        "release_title": "",
        "public_stable": {"tag": "", "source": ""},
        "reviews": {name: {"verdict": "pending", "finding": ""} for name in REVIEWERS},
        "preparation": {field: {"status": "pending", "evidence": ""} for field in PREPARATION},
        "publication": {field: {"status": "pending", "evidence": ""} for field in PUBLICATION},
        "open_blockers": [],
    }


def verification_errors(identity, record, closeout):
    if not isinstance(record, dict) or record.get("inventory") != identity:
        return ["Review identity or coverage differs from the requested source and documents."]
    errors = []
    reviews = record.get("reviews")
    for name in REVIEWERS:
        entry = reviews.get(name) if isinstance(reviews, dict) else None
        if not isinstance(entry, dict) or entry.get("verdict") != "clear" or not evidence(entry.get("finding")):
            errors.append(f"{name}: missing finding or unresolved objection.")
    sections = {"preparation": PREPARATION}
    if closeout:
        sections["publication"] = PUBLICATION
    for section, fields in sections.items():
        findings = record.get(section)
        for field in fields:
            entry = findings.get(field) if isinstance(findings, dict) else None
            if not isinstance(entry, dict) or entry.get("status") != "verified" or not evidence(entry.get("evidence")):
                errors.append(f"{section}: a verified finding with evidence is required for {field}.")
    if record.get("open_blockers") != []:
        errors.append("Resolve and record all release-blocking findings.")
    return errors


def evidence(value):
    return isinstance(value, str) and value.strip().lower() not in {"", "pending", "todo", "pass", "n/a"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("inventory", "validate", "closeout"))
    parser.add_argument("--source", required=True, help="Exact package source revision")
    parser.add_argument("--docs", help="Reviewed documentation revision (defaults to package source)")
    parser.add_argument("--record", type=Path, help="Private review JSON, required for validate and closeout")
    args = parser.parse_args()
    if (args.action == "inventory") == bool(args.record):
        parser.error("inventory prints a blank record; validate and closeout require --record")
    identity = inventory(args.source, args.docs or args.source)
    if args.action == "inventory":
        print(json.dumps(template(identity), indent=2))
        return 0
    record = json.loads(args.record.read_text())
    errors = verification_errors(identity, record, args.action == "closeout")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Private documentation record {args.action} passed for {identity['release_version']} "
          f"on {identity['documentation_commit']} ({len(identity['files'])} files).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
