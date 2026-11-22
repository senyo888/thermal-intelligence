# SPDX-License-Identifier: GPL-3.0-only
"""Exact supported package and generated-module identities."""
import re

VERSION = re.compile(r"(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(beta|rc)\.[1-9]\d*)?")


def channel_for(version):
    match = VERSION.fullmatch(version) if isinstance(version, str) else None
    if not match:
        raise ValueError("Expected a stable, beta or rc version without build metadata")
    return match.group(1) or "stable"


def validate_bundle(version, text):
    channel = channel_for(version)
    match = re.match(r"/\*! Thermal Intelligence Cards (\S+) — (prerelease )?frontend module\. GPL-3\.0-only\.", text)
    if (not match or match.group(1) != version or
            bool(match.group(2)) != (channel != "stable") or
            not all(tag in text for tag in ["thermal-intelligence-beta-card", "thermal-intelligence-beta-card-editor"])):
        raise ValueError("Module identity does not exactly match the package version and channel")
