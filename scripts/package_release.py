#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Prepare an immutable stable package locally; never promotes, tags or publishes."""
import argparse
import json
import package_core


def package(commit, output):
    return package_core.package(commit, output, channels={"stable"})


def package_marketplace(commit, output):
    return package_core.package_marketplace(commit, output, channels={"stable"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--marketplace", action="store_true", help="Require the reviewed Dashboard metadata and dist/ layout; creates files only, never publishes")
    args = parser.parse_args()
    builder = package_marketplace if args.marketplace else package
    print(json.dumps(builder(args.commit, args.output), indent=2))
