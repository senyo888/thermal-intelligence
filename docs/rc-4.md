# Release candidate 0.1.0-rc.4 — unreleased

RC.4 is prepared on `senyo888-patch-1` for future reconciliation into `develop`. It is not a named release or an available installer update. [RC.3](rc-3.md) remains the published prerelease; its assets and the main discovery snapshot are unchanged.

## Changes from RC.3

- Buttons show brief activation feedback. Provider-selected presets retain their own selection indicator, and pending, accepted, observed and uncertain request outcomes remain distinct.
- Display settings lead to Home Assistant's card editor and Save/Cancel flow. Advanced runtime drafts and export remain available; when clipboard access fails, the latest export text opens and is selected for manual copying.
- Humidity setup combines sliders, exact values and a live display preview. Runtime humidity drafts remain separate from the saved guide.
- Optional-switch selection is searchable. Recovery updates an invalid confirmation's explanation but still requires a fresh confirmation before any request.
- Reading previews retain source and observation status. VT suggestions require explicit adoption and renewed identity checks; selecting a source never enables a feature or sends a command.
- Typed temperature readings support sensor units and live weather temperature units without conversion. The outside reading does not replace the dial's indoor temperature.
- Request presentation exposes one accessible status message. An uncertain request keeps an uncertain overview tooltip while its transport is unsettled and after late acknowledgement, without relaxing the command guard.

RC.4 carries the reviewed beta.8 behavior. Command/provider modules are unchanged from published RC.3. Existing readiness, identity, captured-target, confirmation and no-replay checks remain in force.

## Configuration and rollback

The card type remains `custom:thermal-intelligence-beta-card`, with editor `thermal-intelligence-beta-card-editor` and picker label **Thermal Intelligence Thermostat · RC**. Existing schema-1 and schema-2 configurations, per-card settings and unknown configuration fields remain supported. Advanced export does not save a dashboard.

The `temperature` telemetry kind and `unit_attribute` require beta.8 or RC.4. RC.3 and earlier reject this kind. Keep a compatible saved configuration with its original module before adding temperature rows; rollback must restore both while preserving unrelated dashboard edits. See [configuration](card-configuration.md) and [update and rollback](migration.md).

## Candidate module

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `thermal-intelligence.js` | 219363 | `c5c88f6f662095f1bd0a11254bea1401c2ff8b15a13da500d894fdbb664130ae` |
| `LICENSE` | 34674 | `fb981668c18a279e285fc4d83fba1e836cc84dd4daa73c9697d3cfd2d8aca6e0` |

Package only the reviewed immutable source commit. The generated `manifest.json` identifies that commit/tree and every payload hash. Its RC `delivery_branch: develop` describes the intended delivery branch; it does not show that develop contains the candidate. Manual and Marketplace packages share the module and licence; their manifests differ by distribution metadata.

From a clean checkout of the same `REVIEWED_COMMIT` used below:

```sh
npm ci --no-audit --no-fund
npm test
npm run build
git diff --exit-code -- dist/
npm run test:browser
python3 -B tests/package_test.py
python3 -B tests/marketplace_test.py
python3 -B scripts/check_marketplace.py --commit REVIEWED_COMMIT
python3 -B scripts/package_beta.py --commit REVIEWED_COMMIT --output /tmp/ti-rc4-manual
python3 -B scripts/package_beta.py --commit REVIEWED_COMMIT --marketplace --output /tmp/ti-rc4-marketplace
```

Output directories must not exist. Browser checks require the pinned Playwright Chromium installation. Packaging creates files locally; it does not publish or install them.

## Validation limits

The candidate passed 178 unit tests, 164 synthetic Chromium browser tests, 14 foundation regressions, 13 package tests and eight Marketplace distribution tests. Checks include phone, tablet and desktop layouts, reduced motion, advanced export and failed clipboard paths, configuration preservation, explicit source adoption, typed temperature units, optional controls and request uncertainty. Repeated builds and both package routes are reproducible; public-file, link and redacted secret checks passed.

On 15 November 2026, the exact module above passed a manual Lab trial on HA 2026.11.0 with VT 10.6.4. Served bytes and fresh card/editor registrations matched RC.4. Six inert cards rendered correctly; editor Save/Cancel, weather preview, humidity reset and advanced manual export passed without control requests. Saved dashboard configurations were restored exactly.

Actual button checks covered Generic and switch-based VT temperature, presets and Heat/Off; VT unlock and automatic relock; optional-switch On/Off, cancellation and unavailable-state blocking; range endpoints, keyboard adjustments, fan and both swing controls. Deliberate rejection, rejection after early readback, accepted-but-unobserved requests, delayed acknowledgement, invalid ranges and unavailable recovery retained their distinct outcomes and guards. The delayed request settled once; its uncertainty message and overview explanation remained truthful.

The trial recorded 35 card control requests and eight explicit fixture setup/restoration requests, all with matching acknowledgements and independent server events. Two negative acknowledgements were intentional rejection tests. No request remained pending, and a fresh frontend load caused no replay. All nine climate control tuples and the inert switch/helper settings matched their starting values. No card-runtime defect was found; the module is unchanged.

This is bounded inert-fixture acceptance, not physical heating, installer lifecycle or formal soak acceptance. Marketplace retains RC.2; RC.4 is loaded through a manual resource overlay. The [beta.8 Lab results](compatibility.md#unreleased-beta8-usability-candidate) retain their original identities. Forced transport loss, interrupted held-key drafts and some editor races retain earlier-build or synthetic coverage. Actual screen-reader speech, physical phone/tablet and Companion clients, wider providers and backup restore remain separate checks.
