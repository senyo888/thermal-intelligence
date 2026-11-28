# Contributing to Thermal Intelligence

Start changes on `senyo888-patch-1` and open a pull request to `develop`. After validation, promote `develop` to `main` by pull request. Senyo approves merges, release tags and publication. Documentation and the website can move forward independently of the tagged release assets.

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

## Required release documentation review

Every beta, RC or stable release must pass a full documentation review before its tag or publication. Set `PRIVATE_REVIEW_DIR` to an existing private directory outside the public checkout. The maintainer records the candidate version, channel, exact package commit, current published stable tag and reviewed documentation commit. For a prerelease, the public installation guides continue to describe the published stable card. Use the candidate’s own guide for candidate instructions.

1. From the repository root, generate the review record in a private directory. Replace `SOURCE_SHA` and `DOCS_SHA` with the revisions under review. The inventory includes every tracked Markdown page, issue and PR template, fixture guide, rendered-HTML source, website input and Wiki page. Inspect public interface text in other formats whenever the release touches it.
2. Read all inventory entries, including unchanged pages. Trace new installation, an existing managed card, manual migration, recovery, configuration, issue reporting and contributor reproduction from their public entry points. Verify versioned examples against the tagged or candidate source. Identify previous stable versions, betas and RCs as historical wherever they remain relevant. Preserve genuine old aliases, evidence limits, screenshot provenance and published release notes.
3. Render the README, Wiki, homepage and every route in the sitemap. Follow local, Wiki and project-owned version-pinned links and section anchors. Check badge values **and** destinations, unversioned brand banners and website preview metadata, and the version-specific release header, subheading and migration link.
4. Obtain separate findings from Bella (product and public surfaces), Aetherwing (runtime, evidence and recovery) and Aetherbite (alternatives and missed paths). Explicitly invoke AetherCore for its bounded advisory check. Record initial findings, their resolution and any disagreements privately. Set each verdict to `clear` only when the reviewer has checked the relevant corrections on the final revision and has no outstanding blocker. The maintainer owns the release decision.
5. For each preparation field, enter the observed evidence and set `status` to `verified` when it meets the check. Run **validate** with the completed record before tagging or publishing. Missing reviews, changed source or documentation revisions, and unresolved blockers stop release validation. Refresh the record when the candidate changes. Package preparation and CI regression checks may run before this review.
6. After publication, compare the actual tag, attached manifest and release note with the approved release. Verify the live README and badges, the separately published Wiki against its reviewed pages, and the deployed site, guides, headers and links. Record the exact environment and result of any installer check and outstanding coverage. For an intentionally untagged beta, record the published branch commit, package delivery and designed public scope explicitly. Run the private **closeout** check with the observed evidence. For a release governed by CI, retain the successful live closeout receipt before declaring it complete. If documentation was promoted separately, bind the record to its final revision and recheck the affected findings.

```sh
python3 scripts/check_release_docs.py inventory --source SOURCE_SHA --docs DOCS_SHA > "$PRIVATE_REVIEW_DIR/release-docs.json"
# Complete the review and retain evidence with the private record.
python3 scripts/check_release_docs.py validate --source SOURCE_SHA --docs DOCS_SHA --record "$PRIVATE_REVIEW_DIR/release-docs.json"
# After verifying the public surfaces and completing the publication fields:
python3 scripts/check_release_docs.py closeout --source SOURCE_SHA --docs DOCS_SHA --record "$PRIVATE_REVIEW_DIR/release-docs.json"
```

Follow [Release gates in GitHub Actions](docs/release-ci.md) to activate the official tag controls, attest the four findings, distribute an untagged beta and complete live closeout.

The checker verifies the record’s identity, coverage, required findings and unresolved blockers. The reviewers inspect the evidence. Keep the record and raw observations private. Public release notes contain the user-facing changes and migration guidance.

## Website and Wiki

The static website lives in `site/`. Use Python 3.11 or newer in a virtual environment. Install the website dependency with `python -m pip install --require-hashes -r site/requirements.txt`, then run `python scripts/build_site.py` from a checkout without an existing `_site/` directory. GitHub Pages publishes the selected output on `main`.

Edit the [Marketplace installation guide](docs/wiki/Installing-with-Marketplace.md) or the [first-room setup guide](docs/wiki/Configuration.md) in `docs/wiki/`. The website builds both guides from those files. The hosted GitHub Wiki has its own publication step.

## Dependency updates

Dependabot version-update pull requests target `develop` for npm development tools and GitHub Actions. Review major upgrades separately. Regenerate the checked-in bundle when a build-tool update changes its output; do not merge a dependency update with a stale bundle or failing checks.

Dependabot configuration is read from the default branch. Security-update pull requests use the default branch, so assess and reproduce fixes in `develop` before release promotion. No update is automatically merged or installed. VT, Home Assistant and externally pinned tooling need a separate compatibility review; see [dependency monitoring](docs/dependency-monitoring.md).
