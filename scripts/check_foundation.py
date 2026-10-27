#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Check indexed public files. No network calls or workspace writes."""

import hashlib
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


def git(*args):
    return subprocess.check_output(["git", *args])


def main():
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
            if target.scheme or target.netloc or not target.path:
                continue
            links += 1
            resolved = posixpath.normpath(str(path.parent / unquote(target.path)))
            if name.startswith("docs/wiki/") and not PurePosixPath(resolved).suffix:
                resolved += ".md"
            if resolved not in indexed:
                errors.append(f"{name}: local link is not an indexed file: {resolved}")

    if "LICENSE" not in indexed:
        errors.append("LICENSE: missing")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Foundation checks passed: {len(indexed)} indexed files, {links} local links.")
    print("Scope: file boundaries, documentation structure and licence text; no runtime validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
