# Changelog

No public release exists yet.

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

- Recorded standalone thermostat-first scope, HI sibling relationship and later component roadmap.
- Defined provider capability, evidence, ownership, editor and command contracts.
- Separated public contributor contracts from ignored operational continuity.
