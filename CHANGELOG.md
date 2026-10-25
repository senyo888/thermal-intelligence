# Changelog

No stable release exists yet.

## 0.1.0-beta.1 — untagged beta, 25 October 2026

- Separate beta card/editor registrations allow existing TI cards to coexist without renaming the legacy installation. The canonical layout, dialogs and LED animation are retained. The lock is reduced to 14 px and header/status icons are aligned with their text.
- Keep the dark settings popup input background explicit so text remains readable under light and dark HA themes; the native HA card editor still follows its host theme.
- Add the public beta presentation, dry graphite header and synthetic UI captures.
- Verify test-environment coexistence, first-install rollback, update rollback and reapplication; bind the exact tested module in the [beta guide](docs/beta.md).
- Add exact-commit packaging, deterministic manifests, coexistence tests and redacted secret/public-data scans. See [installation and rollback](docs/migration.md).

## Unreleased — public identity, 2026-10-25

## Unreleased — VT presence and feature behaviour, 2026-10-25

- Clarified that VT Presence selects home/away preset temperatures, while room Motion selects temperatures in Activity mode. Updated the focused popup explanations and configuration documentation.
- Prevented retained VT motion/window/presence readings from appearing current when the manager's explicitly reported input is missing, unknown or unavailable. This display correction sends no command and does not change VT's controller behaviour.

## Unreleased — test-environment validation, 2026-10-25

- Installed the development module in HA 2026.10.0 and exercised Generic Thermostat plus four VT 10.5.1 control paths with inert outputs. Added separate setup/unavailable/readiness failure cards and varied per-card header fixtures.

## Unreleased — coherent header states, 2026-10-25

- Restored canonical window Open/Closed, motion Detected/Clear, presence Home/Away, power Limiting/Normal and Follow On/Off presentation through explicit visual telemetry types. Window and motion glyphs change with state; active colours and muted degraded states match the source design.
- Aligned focused popup states and explanations with the icons, without measurement-unit clutter for categorical readings. Known VT configuration flags distinguish an unconfigured feature from an inactive detector.
- Compared the source and candidate LED animation timings, staggered phases, sampled brightness, halo keyframes and reduced-motion behavior; retained the original animation.

## Unreleased — VT lock indication, 2026-10-25

- Added a small lock/unlock icon beside the card name, based only on VT's reported lock state. Unknown or unavailable lock data is distinct; the icon sends no commands and preserves existing user-lock restrictions.
- Defined VT (Versatile Thermostat) and TRV (thermostatic radiator valve) in the README and expanded TRV in valve documentation.

## Unreleased — interaction fix, 2026-10-25

- Keep unchanged thermostat controls mounted across unrelated Home Assistant updates, so native mode menus remain usable. Preserve live availability gating and restore reported targets after cancelled drafts. The source animation phase is stable per card instance; rendered geometry and canonical comparison pixels are unchanged.

## Unreleased — canonical UI restoration, 2026-10-25

- Preserved the TI renderer and exact finishing styles: glass dome, diamond ticks, pearl targets, telemetry, pill controls, disclosure and original dialog surfaces.
- Restored active-only preset readings through explicit source associations, original target-comparison colours, and the four-boundary/five-colour humidity guide. Preset selection remains provider-owned; legacy display configuration is retained.
- Preserved marker pickup offsets, keyboard drafts, range endpoints, dialog focus and local drafts across passive updates. Settings and colour dialogs explicitly export drafts; dashboard persistence still uses Home Assistant's card editor.
- Added canonical fixtures using the original 20°C current/21°C target and native 280/320px widths, with source/candidate comparisons. Private ownership, cutoff, recovery and timetable controls remain explicitly deferred.

## Unreleased — standalone local preview, 2026-10-25

- Implemented a standalone thermostat card and complete native visual editor, including an empty setup state, per-card settings and preservation of unknown configuration.
- Added registry-backed provider identity, VT readiness/lock restrictions, independent capabilities, attributed telemetry and display-only humidity bands.
- Added deliberate temperature/mode/preset/fan/swing requests with captured targets, uncertain-outcome handling and no replay after reconnect. Session, configuration and concurrent target changes cancel input drafts.
- Built a single local module without runtime dependencies and added synthetic unit/browser regression fixtures. Browser testing caught and fixed timer receiver binding, focus redraw and a telemetry editor edit-loss bug.
- Prepared three original, unselected Thermal home raster concepts with provenance. No final logo, artwork licence, HACS package, live HA validation, deployment or product release is established by this work.

## Unreleased — public foundation, 2026-10-25

- Prepared the reviewed foundation for `main` and `develop`, with contributor guidance and explicit planned-product status.
- Added five issue forms, private security reporting links, CODEOWNERS and a PR template.
- Added a pinned, read-only GitHub Actions workflow for public-file boundaries, documentation structure and licence-text checks, with push, pull-request and manual triggers.
- Kept operational continuity and private implementation outside the published tree.

## Unreleased — licensing, 2026-10-25

- Use GPL-3.0-only for TI code; third-party, documentation and artwork rights remain separate.
- Created the public GitHub repository and linked the local workspace. That creation checkpoint preceded the foundation upload above; no release or deployment occurred.

## Unreleased — foundation, 2026-10-25

- Recorded standalone thermostat-first scope, shared engineering standards with HI and later component roadmap.
- Defined provider capability, evidence, ownership, editor and command contracts.
- Separated public contributor contracts from ignored operational continuity.
