# Contributing to Thermal Intelligence

The initial thermostat beta is on `senyo888-patch-1`; `main` contains the presentation and documentation, and `develop` retains the foundation until the beta is ready to integrate. There is no stable release. TI code is GPL-3.0-only; documentation and artwork reuse terms remain separate. See [licence scope](docs/licensing-options.md).

Read the [architecture](ARCHITECTURE.md) and [agent guide](AGENTS.md). Preserve provider truth, safe degraded states, explicit command targets and complete visual onboarding. Keep patches small and update related documentation and meaningful tests.

Open pull requests against `develop`. `main` is the default branch and will retain stable release history once releases exist. Senyo works on `senyo888-patch-1`; ordinary contributions still target `develop` unless an issue explicitly identifies a beta base. Senyo reviews scope and merge decisions; CODEOWNERS identifies the reviewer but does not itself enforce branch protection.

For a PR, describe the concrete problem and changed behavior, evidence actually run, compatibility/migration impact and remaining limitations. Check public examples, source maps, screenshots and logs for private data. Runtime changes need relevant contract/race tests; UI changes need editor/onboarding and accessibility checks; docs-only changes need link/content/privacy validation.

Planned gallery entries live under `ui-gallery/<example-id>/` with `README.md`, `card.yaml` or `dashboard.yaml`, `preview.png`, required dependencies/versions and public-safe fixture provenance. Examples must not silently add control policy or require a private home topology.

Use the [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose) for bugs, help, features, proposals and gallery submissions. Interest does not approve scope. Contributors retain their rights; code contributions must be compatible with GPL-3.0-only and preserve third-party notices. Documentation/artwork contributions may be discussed now, but their reuse terms must be agreed before merging. No copyright assignment or additional CLA/DCO policy is imposed by this file.

## Checks

With Python 3 installed, run `python3 scripts/check_foundation.py` against the staged/tracked public files and `git diff --check`. The GitHub **Project checks** workflow runs the structural and public-data checks plus redacted Gitleaks scans on pushes and pull requests, and supports manual runs from Actions. It verifies private-file boundaries, local Markdown links, fences, whitespace and the standard licence text. It is not a runtime, provider, HACS or full secret-scan test.

Before publication, run Gitleaks with redacted output against the exact candidate tree and Git history. Keep scanner reports private. The beta branch additionally runs unit/browser tests, reproducible build and exact-commit packaging checks. HACS validation remains separate and unverified.
