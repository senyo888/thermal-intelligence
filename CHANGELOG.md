# Changelog

## 1.0.0 — Unreleased

- Choose a thermostat, add independent room sensors or expose VT readings, and arrange the top row separately on each card.
- Read the confirmed control source and applicable preset together. Open the indicator for ownership, House policy and Schedule details.
- Configure the optional VT temperature response arc using measured room trend and accepted output.
- Select **Thermal Intelligence Thermostat** in Add Card. New YAML uses `custom:thermal-intelligence-thermostat`. Saved beta and RC cards keep working.
- See presets and control source first, with preset labels centred over their temperatures. Adjust humidity colours with four markers on a single bar or enter exact percentages.
- The dashboard editor shows a validation message for malformed icon or VT reading lists. Correcting the YAML restores the preview.
- Adding an outside reading now preserves malformed telemetry or feature mappings and shows the validation error so you can correct the YAML and retry.

[Senyo’s introduction](docs/v1.0.0.md) · [Package details](docs/v1.0.0-package.md) · [First-room walkthrough](docs/wiki/Configuration.md) · [Tested coverage](docs/compatibility.md#unreleased-100-package). RC.3 is the published prerelease.

## 0.1.0-rc.4 — Unreleased

- Carry beta.8’s clearer button feedback, Home Assistant editor guidance, humidity controls, source previews/suggestions and typed temperature observations into an RC candidate.
- Preserve advanced draft/export and its clipboard fallback, optional-switch search/recovery, unknown configuration fields and existing control guards.
- Reveal the selected manual-copy configuration after the icon dialog updates its layout.
- Keep uncertain request tooltips consistent while a transport is still settling and after a late acknowledgement.
- Retain develop’s reviewed Pages tooling and align telemetry and migration guidance with current behavior.
- Combine reported control source and preset in one icon, with Unknown standing alone and confirmed local adjustments marked as the last action. Keep categorical states icon-only, with full details on hover or press.
- Add VT outside-temperature and native auto start/stop observations, and arrange expanded mode, preset settings and compact utility controls consistently across providers.
- Keep expanded reading values upright and show manual-action history only while the current targets match the acknowledged request.
- Pair Schedule ownership with an explicitly mapped last-confirmed Frost, Eco, Comfort or Boost mode, including when the thermostat preset is `none`. Preserve unavailable, pending and storage-error evidence without borrowing another preset.
- Keep invalid source-guard values editable without accepting them, and refresh expiring combined control icons during a dial draft without interrupting the gesture.

Prepared on `senyo888-patch-1` for reconciliation into `develop`; RC.3 remains the published prerelease. [RC.4 package checks and limits](docs/rc-4.md) distinguish each Lab-tested module from the later immutable-commit Marketplace installation and bounded Stable Schedule/Boost checks. Temperature and guarded control-source mappings require compatible module/configuration rollback together.

## 0.1.0-beta.8 — Unreleased

- Make button activation, provider-selected presets and pending or uncertain requests easier to distinguish.
- Expose one accessible request-status message, including when a temperature draft is cancelled.
- Lead display setup through Home Assistant’s card editor, preserving advanced draft/export in the runtime dialogs.
- Open and select the advanced configuration text when clipboard access is unavailable.
- Add humidity sliders, exact fields and a live display preview to the editor; keep the saved guide distinct from runtime drafts.
- Search optional switches by name or entity ID without changing selection or enrollment.
- Update an invalid switch confirmation's explanation when the switch recovers, while still requiring a fresh confirmation.
- Preview reading icons, values and source status; offer explicitly adopted VT source suggestions with identity revalidation.
- Add typed temperature observations and a guided outdoor sensor/weather mapping with live unit validation.

Existing schemas, control guards, per-card settings and unknown configuration fields remain supported. Older modules cannot read the new `temperature` kind: retain compatible configuration and its module together for rollback. Synthetic checks and bounded Lab display and control checks passed; see [coverage and limits](docs/compatibility.md#unreleased-beta8-usability-candidate). This is an unreleased beta, not an installation recommendation.

## 0.1.0-rc.3 — 14 November 2026

- Preserve submillisecond ordering when climate or VT lock reports contradict an earlier match before acknowledgement.
- Show thermostat-reported activity when a valve mapping is explicitly disabled.
- Keep long headings within read-only-lock layouts without header telemetry.
- Keep general humidity details aligned with their mapped source and reset edited boundaries without clearing unrelated configuration.
- Recover from failed registry reads with a bounded retry budget and matching cached evidence, preserving session and provider restrictions.
- Respect range drag and keyboard bounds, including Home/End, and keep valid measured trend visible while controls remain locked.
- Keep the manual humidity copy field aligned with current edits and validation, including delayed clipboard failures.
- Isolate delayed synthetic observations across fixture resets and complete both stale registry reads in the rejection regression.

Configuration schemas and trial registrations are unchanged. See the [release record](docs/rc-3.md); the corrected module passed bounded passive manual Lab acceptance on 13 November. Named-release Marketplace acceptance remains separate; an earlier build was rolled back after observation lost freshness.

There is no stable release yet. Future release candidates are prepared through `develop`; beta work uses `senyo888-patch-1`.

## 0.1.0-rc.2 — 9 November 2026

Published prerelease; [subsequent validation through 12 November](docs/rc2-validation.md) records scoped Lab/Stable acceptance and remaining limits. The released package is unchanged.

- Integrate the beta.5 disabled-lock correction and beta.6–beta.7 optional switch control with its registry identity checks. Keep schema-1 cards unchanged and require explicit schema-2 enrollment.
- Retire successful request notices after context loss or contrary provider state; notify presentation consumers and retain report ordering, request outcomes, failure/uncertainty and no-replay guards.
- Snapshot optional-control configuration until an explicit configuration update, and restore rejected switch label/icon edits before unrelated settings can be saved.
- Keep dialog drafts from evaluating configuration getters; preserve unknown plain data and disable incomplete configuration exports with an explanation.
- Align installation guidance with Home Assistant Marketplace while retaining older HACS and immutable RC.1 guidance.
- Use canonical Wiki links in the repository mirror and check their indexed page targets without implying Wiki publication.
- Retain Playwright 1.65.0 tooling and RC package identity. RC.2 was published on 9 November 2026; subsequent installation and control results are recorded separately above.

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

## RC.1 distribution — published 3 November 2026

- Add Dashboard package metadata for HACS and Home Assistant Marketplace, with the default branch hidden from download choices and its reviewed RC.1 snapshot retained for discovery.
- Include the software licence in `dist/` and validate installation files and reproducible candidate assets in CI.
- Preserve the existing frontend and saved configurations. RC.1 is published with its three immutable assets. Installer lifecycle, migration and catalogue checks remain separate; see [distribution status](docs/distribution.md).

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
