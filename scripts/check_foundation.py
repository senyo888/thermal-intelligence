#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Check indexed public files. No network calls or workspace writes."""

import hashlib
import json
import os
import posixpath
import re
import subprocess
import sys
from pathlib import PurePosixPath
from urllib.parse import unquote, urlsplit


PRIVATE_DOCUMENTS = {
    "PROJECT_BRIEF.md",
    *(f"docs/{name}.md" for name in (
        "decisions", "branding", "ui-fidelity", "extraction-plan",
        "development-preview", "lab-testing", "lab-validation", "sources",
        "roadmap", "governance", "release-governance", "issue-triage",
    )),
}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"}

# Frozen RC.3 candidate distribution from f93fb6489f87fbf9c393dd8cd03e85e5718277ef.
# Update only alongside an explicitly reviewed candidate promotion.
DISTRIBUTION_HASHES = {
    "dist/thermal-intelligence.js": "750be9cc7acc0f1a6449be0a578c90d73d771372a106e2af9d31d8d5d45a45be",
    "dist/LICENSE": "fb981668c18a279e285fc4d83fba1e836cc84dd4daa73c9697d3cfd2d8aca6e0",
}
HACS_METADATA = {
    "name": "Thermal Intelligence",
    "filename": "thermal-intelligence.js",
    "content_in_root": False,
    "hide_default_branch": True,
}


def git(*args):
    return subprocess.check_output(["git", *args])


def check_distribution(indexed):
    """Reject indexed payloads that differ from the promoted main snapshot."""
    errors = []
    for name in {*DISTRIBUTION_HASHES, "hacs.json"}:
        if indexed.get(name) != "100644":
            errors.append(f"{name}: reviewed distribution file missing or not a regular non-executable file")
            continue
        data = git("show", f":{name}")
        if name in DISTRIBUTION_HASHES:
            if hashlib.sha256(data).hexdigest() != DISTRIBUTION_HASHES[name]:
                errors.append(f"{name}: differs from the reviewed RC.3 snapshot")
        else:
            try:
                metadata = json.loads(data)
            except (ValueError, UnicodeDecodeError):
                errors.append("hacs.json: invalid JSON")
                continue
            if metadata != HACS_METADATA or any(
                type(metadata[key]) is not type(value)
                for key, value in HACS_METADATA.items()
            ):
                errors.append("hacs.json: differs from the reviewed Dashboard metadata")
    for name in indexed:
        if name.startswith("dist/") and name not in DISTRIBUTION_HASHES:
            errors.append(f"{name}: unexpected distribution payload")
        if "/" not in name and name.endswith(".js") and name != "playwright.config.js":
            errors.append(f"{name}: root module could shadow the reviewed distribution")
    return errors


def main():
    """Check public files and enforce the frozen snapshot outside candidate targets."""
    entries = git("ls-files", "--stage", "-z").split(b"\0")
    indexed = {}
    errors = []
    for entry in filter(None, entries):
        metadata, raw_path = entry.split(b"\t", 1)
        mode, _, stage = metadata.decode().split()
        path = raw_path.decode()
        if stage != "0":
            errors.append(f"{path}: unresolved index stage")
            continue
        indexed[path] = mode

    if not indexed:
        print("No indexed files. Stage the intended public files first.", file=sys.stderr)
        return 1

    links = 0
    for name, mode in indexed.items():
        path = PurePosixPath(name)
        if mode == "120000":
            errors.append(f"{name}: review symlink publication explicitly")
            continue
        if ".private" in path.parts or ".codex" in path.parts or path.name == "AGENTS.local.md":
            errors.append(f"{name}: private operational file in public index")
        if name in PRIVATE_DOCUMENTS or name.startswith(("assets/brand/", "assets/preview/")):
            errors.append(f"{name}: internal working material in public index")
        if name.startswith("assets/") and path.suffix not in IMAGE_SUFFIXES:
            errors.append(f"{name}: assets must contain selected images only")
        if path.name == ".env" or (path.name.startswith(".env.") and path.name != ".env.example"):
            errors.append(f"{name}: environment file in public index")

        data = git("show", f":{name}")
        if name == "LICENSE":
            blob = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
            if blob != "f6cdd22a6c1fbc887e08a215cb4beb3c47048041":
                errors.append("LICENSE: differs from the approved standard GPL-3.0 text")
            continue
        if path.suffix not in {".md", ".py", ".yml", ".yaml", ".json", ".toml", ".txt", ".html", ".css", ".xml"} and name not in {".gitignore", ".github/CODEOWNERS"}:
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            errors.append(f"{name}: expected UTF-8 text")
            continue
        if not text.endswith("\n"):
            errors.append(f"{name}: missing final newline")
        if any(line.rstrip() != line for line in text.splitlines()):
            errors.append(f"{name}: trailing whitespace")
        if path.suffix != ".md":
            continue
        if re.search(r"/Users/|/home/|~/Library/", text):
            errors.append(f"{name}: local home-directory path in documentation")
        if sum(line.startswith("```") for line in text.splitlines()) % 2:
            errors.append(f"{name}: unbalanced Markdown fences")
        for destination in re.findall(r"\[[^\]]*\]\(([^)\n]+)\)", text):
            target = urlsplit(destination.strip("<>"))
            wiki_root = "/senyo888/thermal-intelligence/wiki"
            if target.scheme == "https" and target.netloc == "github.com" and (
                target.path == wiki_root or target.path.startswith(wiki_root + "/")
            ):
                # Canonical Wiki routes render in both the repo mirror and Wiki.
                # Check the intended page locally; this does not prove publication.
                slug = unquote(target.path.removeprefix(wiki_root).removeprefix("/")) or "Home"
                if "/" in slug or slug in {".", ".."} or slug.endswith(".md"):
                    errors.append(f"{name}: use a canonical Wiki page URL: {destination}")
                    continue
                resolved = f"docs/wiki/{slug}.md"
            elif target.scheme or target.netloc or not target.path:
                continue
            else:
                # GitHub repository rendering requires the actual indexed path.
                resolved = posixpath.normpath(str(path.parent / unquote(target.path)))
            links += 1
            if resolved not in indexed:
                errors.append(f"{name}: local link is not an indexed file: {resolved}")

    if "LICENSE" not in indexed:
        errors.append("LICENSE: missing")
    # PR base wins over the checkout ref. Unknown/local targets stay strict.
    target = os.environ.get("GITHUB_BASE_REF") or os.environ.get("GITHUB_REF", "").removeprefix("refs/heads/")
    if target not in {"develop", "senyo888-patch-1"}:
        errors.extend(check_distribution(indexed))
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Foundation checks passed: {len(indexed)} indexed files, {links} local links.")
    print("Scope: file boundaries, documentation structure and licence text; no runtime validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
