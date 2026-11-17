# Release candidate 0.1.0-rc.4 — unreleased

## Unreleased control-icon and expanded-layout refinement

The working RC.4 now adds advertised preset indicators, separate provider/policy/control-source icons, VT outside temperature and auto start/stop observations. Other providers and reported policies use a circled P; VT uses its own text badge. Optional House and schedule mappings remain read-only. The expanded card places Mode above the side-by-side preset-temperature and icon-settings buttons, with compact utilities below. Runtime drafts and advanced export are preserved.

The locally built module is 258549 bytes, SHA-256 `f822b133316a354262c8516db3f34f77de1c9dce9e0ad36acdd1fcecc4efb9a3`. Synthetic checks cover the new indicators, independent mappings, manual-action retirement, safe native navigation, editor clearing and compact layouts.

These changes are separate from the earlier installed modules and acceptance results below. They have not been installed on HA Lab or Stable. See [configuration](card-configuration.md#presets-provider-and-policy-icons) and the [VT navigation boundary](provider-contracts.md#additional-vt-observations-and-native-controls).

RC.4 is prepared on `senyo888-patch-1` for future reconciliation into `develop`. It is not a named release or an available installer update. [RC.3](rc-3.md) remains the published prerelease; its assets and the main discovery snapshot are unchanged.

## Changes from RC.3

- Buttons show brief activation feedback. Provider-selected presets retain their own selection indicator, and pending, accepted, observed and uncertain request outcomes remain distinct.
- A dedicated **Top row icon settings** page provides selection, ordering, preview, Cancel and configuration copying. The HA editor exposes the same controls and owns Save/Cancel. Advanced runtime drafts and export remain available; when clipboard access fails, the latest export text opens and is selected for manual copying.
- Humidity setup combines sliders, exact values and a live display preview. Runtime humidity drafts remain separate from the saved guide.
- Optional-switch selection is searchable. Recovery updates an invalid confirmation's explanation but still requires a fresh confirmation before any request.
- VT icon choices include separate manual/automatic windows, Motion, Presence, Follow, power limiting, humidity, temperature-report age and attributed energy/power readings. Provider observations remain read-only; a visible link opens Home Assistant’s native VT settings.
- Reading previews retain source and observation status. VT suggestions require explicit adoption and renewed identity checks; selecting a source never enables a feature or sends a command.
- Typed temperature readings support sensor units and live weather temperature units without conversion. The outside reading does not replace the dial's indoor temperature.
- Request presentation exposes one accessible status message. An uncertain request keeps an uncertain overview tooltip while its transport is unsettled and after late acknowledgement, without relaxing the command guard.

RC.4 carries the reviewed beta.8 behavior. Command/provider modules are unchanged from published RC.3. Existing readiness, identity, captured-target, confirmation and no-replay checks remain in force.

## Configuration and rollback

The card type remains `custom:thermal-intelligence-beta-card`, with editor `thermal-intelligence-beta-card-editor` and picker label **Thermal Intelligence Thermostat · RC**. Existing schema-1 and schema-2 configurations, per-card settings and unknown configuration fields remain supported. Advanced export does not save a dashboard.

The `temperature` telemetry kind and `unit_attribute` require beta.8 or RC.4. RC.3 and earlier reject this kind. Keep a compatible saved configuration with its original module before adding temperature rows; rollback must restore both while preserving unrelated dashboard edits. See [configuration](card-configuration.md) and [update and rollback](migration.md).

## Latest Lab-tested revision — 16 November 2026

The current module is 243670 bytes, SHA-256 `8ffca1f7a4636862cd754cb588f6ab50b4ded7748215d40aeb981582c4fc0b2c`, built from `20fcd0b40b2208cd0669b5dc349409a7bb44df5a`. Lab testing found one Safari usability issue: the first manual-copy fallback selected the configuration without reliably revealing it. The corrected dialog focuses, selects and scrolls the export into view after its status layout settles. The first-copy path passed again in Safari. All 184 unit, 186 browser, 14 foundation, 13 package and eight distribution checks passed, with public-data and redacted secret checks.

On HA 2026.11.0, the final module passed runtime icon selection/export, the native VT device-settings link, Generic and VT temperature buttons, VT presets and unlock/automatic relock, optional-switch Cancel/On/Off, and the inert range fixture's HVAC mode, endpoints, fan and both swing controls. Runtime settings sent no service requests or dashboard writes. An intentional rejection displayed a notice for 9,999 ms; the amber LED retained its failure explanation after the notice disappeared. A later successful request restored the observed outcome and green LED.

The trial recorded 18 card requests and three explicit fixture setup/restoration requests, each with a matching acknowledgement and server event. One negative acknowledgement was intentional. No request remained pending. Nine climate control tuples, helper/switch values and the full dashboard configuration matched their baselines. Targeted rollback copies were verified. Protected-file comparison found only the expected resource changes: the manual RC.4 URL changed and a duplicate Marketplace RC.3 registration was removed. The Marketplace package and integration configuration were preserved.

The unchanged native editor implementation's Save/reopen and exact dashboard restoration were checked on the immediately preceding `b650df…` module below; those actions were not repeated after the export-layout-only fix. The loaded VT version could not be independently established from runtime metadata, so this result is not a new VT-version compatibility certification. This is bounded inert testing, not physical heating, installer lifecycle or formal soak acceptance. The final restored page was viewed after reload, without a recorder spanning that reload; post-action replay absence is therefore not a fresh measured result. Earlier uncertainty/delay paths and other unexercised controls retain their original or synthetic coverage. Stable was not changed.

## VT icon-settings preview — 16 November 2026

This revision restores the dedicated icon page and completes its portable VT observation catalogue. Display ordering and hiding preserve underlying sensor mappings and controls. The runtime page exports drafts; saving belongs to Home Assistant’s selected-card editor. Runtime configuration matching never grants dashboard write authority. VT configuration remains in Home Assistant’s native provider settings. It is 243621 bytes, SHA-256 `b650df717b61bf0015aee47bbdb4fb73cec2853ba2b2509216333dbcd34b144c`, and passed 184 unit and 186 synthetic browser tests, 14 foundation, 13 package and eight distribution checks. Coverage includes stale/duplicate-card isolation, no runtime dashboard writes, clipboard failure and late results, source freshness, rename preservation, keyboard/drag ordering and responsive presentation. Lab checks covered selection, arrow/keyboard ordering, advanced export, native editor Save/reopen and exact restoration, with zero control requests. It was then superseded on Lab by the export-layout correction above. It was not installed on Stable.

## Quiet feedback follow-up — 16 November 2026

The working candidate keeps button activation feedback and removes routine request banners from below the card. Issue notices disappear after ten seconds; unresolved request issues retain an amber LED and overview details, with red reserved for disconnected or unavailable thermostats. Accessible status, command guards and advanced export remain intact.

That quiet-feedback revision is 220371 bytes, SHA-256 `718e6f5f076c9471bbc6a634fa3dd515255a02c1db7365d3d982d65a6cdc3cff`. It passed 178 unit and 171 synthetic browser tests, including notice expiry, repeated failures, independent cards, unchanged selectors after expiry, and phone/tablet/desktop layouts. It has not been loaded on HA Lab or Stable. The earlier live results below apply only to the earlier module.

## Earlier Lab-tested module — 15 November 2026

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

The earlier module in the table passed 178 unit tests, 164 synthetic Chromium browser tests, 14 foundation regressions, 13 package tests and eight Marketplace distribution tests. Checks include phone, tablet and desktop layouts, reduced motion, advanced export and failed clipboard paths, configuration preservation, explicit source adoption, typed temperature units, optional controls and request uncertainty. Repeated builds and both package routes are reproducible; public-file, link and redacted secret checks passed.

On 15 November 2026, the exact module above passed a manual Lab trial on HA 2026.11.0 with VT 10.6.4. Served bytes and fresh card/editor registrations matched RC.4. Six inert cards rendered correctly; editor Save/Cancel, weather preview, humidity reset and advanced manual export passed without control requests. Saved dashboard configurations were restored exactly.

Actual button checks covered Generic and switch-based VT temperature, presets and Heat/Off; VT unlock and automatic relock; optional-switch On/Off, cancellation and unavailable-state blocking; range endpoints, keyboard adjustments, fan and both swing controls. Deliberate rejection, rejection after early readback, accepted-but-unobserved requests, delayed acknowledgement, invalid ranges and unavailable recovery retained their distinct outcomes and guards. The delayed request settled once; its uncertainty message and overview explanation remained truthful.

The trial recorded 35 card control requests and eight explicit fixture setup/restoration requests, all with matching acknowledgements and independent server events. Two negative acknowledgements were intentional rejection tests. No request remained pending, and a fresh frontend load caused no replay. All nine climate control tuples and the inert switch/helper settings matched their starting values. No card-runtime defect was found; the module is unchanged.

This is bounded inert-fixture acceptance, not physical heating, installer lifecycle or formal soak acceptance. At this earlier trial, Marketplace retained RC.2 and RC.4 used a manual resource overlay. The [beta.8 Lab results](compatibility.md#unreleased-beta8-usability-candidate) retain their original identities. Forced transport loss, interrupted held-key drafts and some editor races retain earlier-build or synthetic coverage. Actual screen-reader speech, physical phone/tablet and Companion clients, wider providers and backup restore remain separate checks.
