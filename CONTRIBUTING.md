# Contributing to Thermal Intelligence

Changes start on `senyo888-patch-1`, then enter `develop` by pull request for release-candidate preparation. A second pull request promotes the validated candidate from `develop` to `main`. Once it merges, tag the approved commit on `main` and publish the stable release from that commit. `main` carries public documentation, the website and the separately promoted frozen distribution snapshot. RC.3 is published from `f93fb6489f87fbf9c393dd8cd03e85e5718277ef`; the [RC.4 candidate](docs/rc-4.md) consolidates beta.8 usability work on `senyo888-patch-1` pending future develop reconciliation. There is no stable release yet. Senyo retains merges; local preparation does not authorize publication or installation.

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

The secret checks require Gitleaks. Keep detailed reports private. For candidate source work, run the relevant unit/browser tests and build/package checks documented in `package.json` and the Project checks workflow. Carry a tested beta into `develop` for RC preparation. A successful source or browser test is not proof of physical heating or installer acceptance.

The [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose) cover bugs, setup help, feature suggestions and gallery submissions. Use [private vulnerability reporting](https://github.com/senyo888/thermal-intelligence/security/advisories/new) for security issues.

Senyo reviews project scope and merges. Code contributions must be compatible with GPL-3.0-only and preserve third-party notices. Documentation and artwork terms must be agreed before merging those contributions; see [licence scope](docs/licensing-options.md).

## Website and Wiki

The static website lives in `site/`; build it with `python3 scripts/build_site.py` from a checkout without an existing `_site/` directory. GitHub Pages publishes only that selected output on `main`. Wiki page sources live in `docs/wiki/` and are published to the separate GitHub Wiki repository. Keep their version, installation, compatibility and image notes aligned with the repository guides.

## Dependency updates

Dependabot version-update pull requests target `develop` for npm development tools and GitHub Actions. Review major upgrades separately. Regenerate the checked-in bundle when a build-tool update changes its output; do not merge a dependency update with a stale bundle or failing checks.

Dependabot configuration is read from the default branch. Security-update pull requests use the default branch, so assess and reproduce fixes in `develop` before release promotion. No update is automatically merged or installed. VT, Home Assistant and externally pinned tooling need a separate compatibility review; see [dependency monitoring](docs/dependency-monitoring.md).
