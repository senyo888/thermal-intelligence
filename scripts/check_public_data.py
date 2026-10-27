#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Scan indexed text, including the bundle, for common private-data mistakes.

This complements Gitleaks and visual review; it is not a complete privacy proof.
Print paths and rule names, never matching data.
"""
import re
import subprocess
import sys


RULES = {
    "private-network-address": rb"\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b",
    "local-user-path": rb"(?:/Users/[a-zA-Z0-9_. -]+/|/home/[a-zA-Z0-9_. -]+/|[A-Z]:\\Users\\[a-zA-Z0-9_. -]+\\)",
    "home-hostname": rb"\b[a-zA-Z0-9-]+\.local\b(?!\.[a-zA-Z])",
}


def main():
    names = subprocess.check_output(["git", "ls-files", "-z"]).split(b"\0")
    findings = []
    count = 0
    for raw in filter(None, names):
        name = raw.decode()
        data = subprocess.check_output(["git", "show", f":{name}"])
        if b"\0" in data:
            continue  # Images require separate visual/provenance review.
        count += 1
        for rule, pattern in RULES.items():
            if re.search(pattern, data):
                findings.append(f"{name}: {rule}")
    if findings:
        print("\n".join(findings), file=sys.stderr)
        return 1
    print(f"Public-data checks passed: {count} indexed text files, including source and bundle when present.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
