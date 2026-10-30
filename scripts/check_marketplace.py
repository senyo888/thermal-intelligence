#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Check TI's distribution contract offline; does not validate a live installer."""
import argparse
import hashlib
import json
import stat
import subprocess
from pathlib import Path


EXPECTED_MANIFEST = {
    "name": "Thermal Intelligence",
    "filename": "thermal-intelligence.js",
    "content_in_root": False,
    "hide_default_branch": True,
}
DIST_FILES = {"dist/thermal-intelligence.js", "dist/LICENSE"}
REQUIRED = {"hacs.json", "package.json", "LICENSE", *DIST_FILES}
ROOT_MODULES = {"thermal-intelligence.js", "thermal-intelligence-bundle.js", "thermal-intelligence.umd.js"}


def git(*args):
    return subprocess.check_output(["git", *args])


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON field")
        result[key] = value
    return result


def validate(read, paths):
    """Validate the small intended install surface, not every upstream option."""
    if REQUIRED - paths:
        raise ValueError("Missing distribution files: " + ", ".join(sorted(REQUIRED - paths)))
    if {p for p in paths if p.startswith("dist/")} != DIST_FILES:
        raise ValueError("dist/ may contain only the module and LICENSE")
    if ROOT_MODULES & paths:
        raise ValueError("A root module would shadow the reviewed dist/ module")
    manifest_bytes = read("hacs.json")
    manifest = json.loads(manifest_bytes, object_pairs_hook=unique_object)
    # Strict types matter: Python otherwise treats 0 as False and 1 as True.
    if (not isinstance(manifest, dict) or manifest != EXPECTED_MANIFEST or
            any(type(manifest[k]) is not type(v) for k, v in EXPECTED_MANIFEST.items())):
        raise ValueError("hacs.json differs from the reviewed Dashboard distribution contract")
    if read("dist/LICENSE") != read("LICENSE"):
        raise ValueError("dist/LICENSE must match the repository licence")
    metadata = json.loads(read("package.json"), object_pairs_hook=unique_object)
    version = metadata.get("version")
    bundle = read("dist/thermal-intelligence.js")
    text = bundle.decode("utf-8")
    if not isinstance(version, str) or not version or not all(value in text for value in (
            version, "thermal-intelligence-beta-card", "thermal-intelligence-beta-card-editor")):
        raise ValueError("Module version or trial registration does not match the package")
    if "sourceMappingURL=" in text or not 0 < len(bundle) <= 1_000_000:
        raise ValueError("Unexpected source map or module size")
    return {
        "category": "plugin",
        "repository_manifest": manifest,
        "repository_manifest_sha256": hashlib.sha256(manifest_bytes).hexdigest(),
        "module_sha256": hashlib.sha256(bundle).hexdigest(),
        "install_files": sorted(DIST_FILES),
        "scope": "Offline package structure only; installation, migration and catalogue inclusion unverified",
    }


def check(commit=None):
    if commit is not None:
        identity = git("rev-parse", "--verify", "--end-of-options", f"{commit}^{{commit}}").decode().strip()
        entries = {}
        for entry in filter(None, git("ls-tree", "-rz", identity).split(b"\0")):
            metadata, raw_path = entry.split(b"\t", 1)
            entries[raw_path.decode()] = metadata.decode().split()[0]

        def read(name):
            if entries.get(name) != "100644":
                raise ValueError("Distribution files must be ordinary non-executable tracked files")
            return git("show", f"{identity}:{name}")

        paths = set(entries)
    else:
        root = Path(git("rev-parse", "--show-toplevel").decode().strip())
        paths = {p.decode() for p in git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split(b"\0") if p}
        # Include ignored leftovers in dist/: an installer may download the
        # whole directory after someone later tracks them or creates an archive.
        if (root / "dist").is_symlink():
            raise ValueError("dist/ must not be a symlink")
        paths.update(p.relative_to(root).as_posix() for p in (root / "dist").rglob("*") if not p.is_dir() or p.is_symlink())

        def read(name):
            path = root / name
            mode = path.lstat().st_mode
            if not stat.S_ISREG(mode) or mode & 0o111:
                raise ValueError("Distribution files must be ordinary non-executable files")
            return path.read_bytes()

        identity = "working-tree (not an immutable package)"
    return {"source": identity, **validate(read, paths)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", help="Check this immutable commit instead of the working tree")
    args = parser.parse_args()
    print(json.dumps(check(args.commit), indent=2))
