#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Shared immutable packaging; creates local files and never publishes."""
import hashlib
import json
import subprocess
from pathlib import Path
from check_marketplace import check as check_marketplace
from package_identity import channel_for, validate_bundle


def git(*args):
    return subprocess.check_output(["git", *args])


def package(commit, output, *, channels):
    commit = git("rev-parse", "--verify", "--end-of-options", f"{commit}^{{commit}}").decode().strip()
    metadata = json.loads(git("show", f"{commit}:package.json"))
    version = metadata["version"]
    channel = channel_for(version)
    if channel not in channels:
        raise ValueError("Version is not eligible for this package route")
    delivery_branch = {"beta": "senyo888-patch-1", "rc": "develop", "stable": "main"}[channel]
    payload = {}
    for source, name in [("dist/thermal-intelligence.js", "thermal-intelligence.js"), ("LICENSE", "LICENSE")]:
        mode = git("ls-tree", commit, "--", source).decode().split()[0]
        if mode != "100644":
            raise ValueError("Payload must contain ordinary, non-executable tracked files")
        payload[name] = git("show", f"{commit}:{source}")
    bundle = payload["thermal-intelligence.js"].decode()
    tag = validate_bundle(version, bundle)
    if "sourceMappingURL=" in bundle or len(payload["thermal-intelligence.js"]) > 1_000_000:
        raise ValueError("Unexpected source map or payload size")
    manifest = {
        "schema": 1, "product": "Thermal Intelligence", "version": version,
        "repository": "https://github.com/senyo888/thermal-intelligence",
        "channel": channel, "delivery_branch": delivery_branch, "source_commit": commit,
        "source_tree": git("rev-parse", f"{commit}^{{tree}}").decode().strip(),
        "card_type": f"custom:{tag}",
        "editor_tag": f"{tag}-editor",
        "files": [{"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                  for name, data in sorted(payload.items())],
    }
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    for name, data in payload.items():
        (output / name).write_bytes(data)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    return manifest


def package_marketplace(commit, output, *, channels):
    """Validate the same immutable source before creating candidate assets."""
    commit = git("rev-parse", "--verify", "--end-of-options", f"{commit}^{{commit}}").decode().strip()
    distribution = check_marketplace(commit)
    manifest = package(commit, output, channels=channels)
    manifest["distribution"] = distribution
    (Path(output) / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    return manifest
