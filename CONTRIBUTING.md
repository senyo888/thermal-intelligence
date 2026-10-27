# Contributing to Thermal Intelligence

Open pull requests against `develop`. The current installable beta is on `senyo888-patch-1`; an issue may specify that branch when a change needs the beta source. `main` contains public documentation and the website. There is no stable release yet.

Read [Architecture](ARCHITECTURE.md) and [AGENTS.md](AGENTS.md). Keep changes focused and describe the problem, resulting behaviour and checks actually run. Update configuration, compatibility, migration and release notes when affected.

## What to check

- Runtime changes: provider capabilities, unknown/unavailable states, command targets and failure paths.
- UI changes: visual consistency, onboarding, editor round trips, keyboard access, reduced motion and responsive layout.
- Documentation changes: plain language, accurate claims, links and rendered layout across README, Wiki and website.
- Public material: remove private entities, credentials, home details and internal correspondence. Check images, fixtures, bundles and source maps as well as prose.

After staging the intended files, run:

```sh
python3 scripts/check_foundation.py
python3 scripts/check_public_data.py
git diff --check
scripts/security/scan_secrets.sh tracked
scripts/security/scan_secrets.sh full-history
```

The secret checks require Gitleaks. Keep detailed reports private. On the beta branch, also run the relevant unit/browser tests and build/package checks documented in `package.json`. A successful source or browser test is not proof of physical heating or HACS installation.

The [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose) cover bugs, setup help, feature suggestions and gallery submissions. Use [private vulnerability reporting](https://github.com/senyo888/thermal-intelligence/security/advisories/new) for security issues.

Senyo reviews project scope and merges. Code contributions must be compatible with GPL-3.0-only and preserve third-party notices. Documentation and artwork terms must be agreed before merging those contributions; see [licence scope](docs/licensing-options.md).

## Website and Wiki

The static website lives in `site/`; build it with `python3 scripts/build_site.py` from a checkout without an existing `_site/` directory. GitHub Pages publishes only that selected output on `main`. Wiki page sources live in `docs/wiki/` and are published to the separate GitHub Wiki repository. Keep their version, installation, compatibility and image notes aligned with the repository guides.
