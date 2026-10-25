#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Package immutable Git blobs; never includes the working tree or credentials."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path


def git(*args):
    return subprocess.check_output(["git", *args])


def package(commit, output):
    commit = git("rev-parse", "--verify", f"{commit}^{{commit}}").decode().strip()
    metadata = json.loads(git("show", f"{commit}:package.json"))
    version = metadata["version"]
    if not re.fullmatch(r"\d+\.\d+\.\d+-beta\.\d+", version):
        raise ValueError("Only an explicit beta version can use this package route")
    payload = {}
    for source, name in [("dist/thermal-intelligence.js", "thermal-intelligence.js"), ("LICENSE", "LICENSE")]:
        mode = git("ls-tree", commit, "--", source).decode().split()[0]
        if mode != "100644":
            raise ValueError("Payload must contain ordinary, non-executable tracked files")
        payload[name] = git("show", f"{commit}:{source}")
    bundle = payload["thermal-intelligence.js"].decode()
    if not all(value in bundle for value in [version, "thermal-intelligence-beta-card", "thermal-intelligence-beta-card-editor"]):
        raise ValueError("Bundle identity does not match beta package")
    if "sourceMappingURL=" in bundle or len(payload["thermal-intelligence.js"]) > 1_000_000:
        raise ValueError("Unexpected source map or payload size")
    manifest = {
        "schema": 1, "product": "Thermal Intelligence", "version": version,
        "repository": "https://github.com/senyo888/thermal-intelligence",
        "delivery_branch": "senyo888-patch-1", "source_commit": commit,
        "source_tree": git("rev-parse", f"{commit}^{{tree}}").decode().strip(),
        "card_type": "custom:thermal-intelligence-beta-card",
        "editor_tag": "thermal-intelligence-beta-card-editor",
        "files": [{"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                  for name, data in sorted(payload.items())],
    }
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    for name, data in payload.items():
        (output / name).write_bytes(data)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    print(json.dumps(package(args.commit, args.output), indent=2))
