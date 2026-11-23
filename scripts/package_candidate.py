#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Prepare immutable CI package assets for a validated channel; never publish."""
import argparse
import json
import package_core


def package(commit, output, *, marketplace=False):
    builder = package_core.package_marketplace if marketplace else package_core.package
    return builder(commit, output, channels={"beta", "rc", "stable"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--marketplace", action="store_true")
    args = parser.parse_args()
    print(json.dumps(package(args.commit, args.output, marketplace=args.marketplace), indent=2))
