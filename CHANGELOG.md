# Changelog

There is no stable release yet. Release candidates are prepared through `develop`; beta.7 remains on `senyo888-patch-1`.

## 0.1.0-rc.2 — in preparation

- Integrate the beta.5 disabled-lock correction and beta.6–beta.7 optional switch control with its registry identity checks. Keep schema-1 cards unchanged and require explicit schema-2 enrollment.
- Retire completed request notices after context loss or contrary provider state; preserve request outcomes, failure/uncertainty and no-replay guards.
- Align installation guidance with Home Assistant Marketplace while retaining older HACS and immutable RC.1 guidance.
- Retain Playwright 1.65.0 tooling and RC package identity. RC.2 is not published or installed yet.

## 0.1.0-rc.1 — 29 October 2026

- Prepare the standalone card as a release candidate through `develop`, retaining beta.4 behaviour and saved schema-1 configurations.
- Show **Thermal Intelligence Thermostat · RC** in the card picker. Keep the existing prerelease element names so saved trial cards continue working alongside legacy TI.
- Add explicit beta/RC package channels and reproducibility checks for branch and pull-request builds.
- Configure weekly dependency updates for npm tooling and GitHub Actions, with provider compatibility reviewed separately.
- HACS installation and a stable release remain unavailable. See the [RC.1 record](docs/rc-1.md) for validation limits.

## 0.1.0-beta.7 — 6 November 2026 (untagged beta)

- Accept equivalent absent device IDs when comparing Home Assistant frontend metadata with its entity-registry response. This fixes a false unavailable status for optional switch controls on device-less entities.
- Keep real identity differences, unsupported providers, explicit confirmation and no-replay checks unchanged. No configuration migration is needed; returning to beta.6 can restore the false block.

## 0.1.0-beta.6 — 6 November 2026 (untagged beta)

- Add one explicitly enrolled standard-provider switch control, with visual configuration and confirmation before On and Off.
- Keep optional-control registry identity, target, reported state and request evidence separate from climate commands; preserve schema-1 behavior and no replay.
- Document integration side effects, including Honeywell emergency-heat Off requesting system Off, and configuration-plus-module rollback.


## 0.1.0-beta.5 — 5 November 2026

- Hide the VT lock indicator when the provider does not explicitly report a configured lock.
- When VT explicitly reports locking disabled, ignore a retained locked flag for ordinary controls; readiness, connection and other command checks still apply.
- Invalidate an open lock action when configuration is removed, without sending Unlock or closing the dialog automatically. Unknown configuration never clears a reported user lock.
- Keep schema-1 card settings unchanged. This beta does not modify the published RC.1 package.

## Unreleased — distribution preparation

- Add Dashboard package metadata for HACS and Home Assistant Marketplace, with the documentation-only default branch hidden from download choices.
- Include the software licence in `dist/` and validate installation files and reproducible candidate assets in CI.
- Preserve the existing frontend and saved configurations. Live installer, migration and catalogue checks remain pending; manual installation is still the available route.

## Documentation — 27 October 2026

- Add the product website and Wiki manual, with state examples and expandable detail galleries.
- Align installation, compatibility and upgrade guidance with beta.4.

## 0.1.0-beta.4 — 26 October 2026

- Fix a false amber health LED when VT explicitly reports no optional Off reason or Mode reason. The overview shows **None reported** for those two null values.
- Keep missing, unknown, unavailable and malformed observations visible. Readiness checks and command permissions are unchanged.
- No saved-configuration migration is needed.

## 0.1.0-beta.3 — 25 October 2026

- Add the response arc's corroborated warming state through explicit VT response sources, with an explanation in the overview.
- Require a current accepted heat request and matching recent room/trend evidence. Restricted, mismatching or expired evidence cannot produce orange.
- Preserve reported cooling, target bands, muted Off/unavailable states and the independent temperature-slope ring.
- Add visual response-source configuration. Existing unmapped cards retain their comparison fallback.

## 0.1.0-beta.2 — 25 October 2026

- Add a VT Lock/Unlock dialog for verified Home Assistant administrators. Other accounts and incomplete capabilities retain a read-only indicator.
- Use VT's native services, code validation, lock scope and automatic relocking. Requests are never automatically replayed.
- Keep lock codes out of saved configuration and request records. Suppress raw provider errors; see the [VT 10.5.1 limitation](docs/lock-control.md#code-handling-and-provider-limits).
- Keep the compact 14 px icon within a 44 px action target.

## 0.1.0-beta.1 — 25 October 2026

- Introduce the standalone thermostat, visual editor, per-card settings and optional telemetry without requiring a TI backend.
- Support standard climate capabilities and VT-specific readiness, restrictions and observations.
- Preserve the glass dial, focused detail panels, humidity presentation and staggered lights.
- Use separate beta card/editor registrations so existing TI cards can coexist.
- Add reproducible packaging, synthetic regression tests and installation/rollback guidance.
