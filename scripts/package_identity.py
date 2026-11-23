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
    legacy = "thermal-intelligence-beta-card"
    current = "thermal-intelligence-thermostat"
    tags = set(re.findall(r"thermal-intelligence-[a-z0-9-]+", text))
    canonical = {current, current + "-editor"}
    if (not match or match.group(1) != version or
            bool(match.group(2)) != (channel != "stable") or
            not {legacy, legacy + "-editor"} <= tags):
        raise ValueError("Module identity does not exactly match the package version and channel")
    if channel == "stable" or canonical.intersection(tags):
        if not canonical.issubset(tags):
            raise ValueError("Module must include both the thermostat card and its editor")
    return current if channel == "stable" else legacy
