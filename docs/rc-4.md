# Release candidate 0.1.0-rc.4 — unreleased

## Combined control icons and expanded layout

RC.4 combines the reported control source and selected preset in one top-row slot, such as VT Eco or House Boost. Unknown or degraded source evidence replaces the other control symbols. A confirmed card temperature adjustment can show a hand with a history mark when no ownership source is mapped; its details identify the last action without claiming current ownership. Reported policies use a circled P, and VT uses a text badge. Optional House and schedule mappings remain read-only.

Categorical readings use icons, colour and hover/press details; numeric readings retain their values and units. The expanded card places Mode above side-by-side preset-temperature and icon-settings buttons, with compact utilities below. VT outside temperature and auto start/stop observations are available. Runtime drafts and advanced export are preserved.

The current module is **265389 bytes**, SHA-256 `25e47e4bdca8328469a1aecf488dd84344ca31854ba921fdc83dafc0e896b9a5`, built from [source `61c299a`](https://github.com/senyo888/thermal-intelligence/commit/61c299a9f0acf4a1ced4698fa3e0b0e531e18489). It adds an explicit last-confirmed Schedule mode, so the calendar can pair with Frost, Eco, Comfort or Boost even when the thermostat preset is `none`. Configured binding, readiness, freshness and null-valued source guards suppress unsupported evidence. A confirmed mode records accepted intent; it does not prove that a period or Boost timer is still running.

This module also retains the earlier upright expanded values and current-target checks for confirmed manual-action history. It was installed through Marketplace by immutable commit and passed the bounded Stable checks below. Its version remains `0.1.0-rc.4`; the hash distinguishes revisions with that same candidate label.

The latest Lab-tested module is 262418 bytes, SHA-256 `d7701409f421da0127a4b5a4fde887aecc86245a860230fc6d39b993e8ef13e9`, built from [source `65d40ef`](https://github.com/senyo888/thermal-intelligence/commit/65d40efc83d0aba14bc1a4fce3625ca36384208c). Its bounded results below remain specific to those bytes. The intermediate 262718-byte module `f1a730956bd471373d9389f0d55a9e9a7267898c7c2056ed1ed75a7d53de71a2` had synthetic coverage and was superseded. See [configuration](card-configuration.md#presets-provider-and-policy-icons) and the [VT navigation boundary](provider-contracts.md#additional-vt-observations-and-native-controls).

RC.4 is prepared on `senyo888-patch-1` for reconciliation into `develop`. The immutable-commit trial is separate from a named release or automatic installer update. [RC.3](rc-3.md) remains the published prerelease; its assets and the main discovery snapshot are unchanged.

## Changes from RC.3

- Buttons show brief activation feedback. Provider-selected presets retain their own selection indicator, and pending, accepted, observed and uncertain request outcomes remain distinct.
- A dedicated **Top row icon settings** page provides selection, ordering, preview, Cancel and configuration copying. The HA editor exposes the same controls and owns Save/Cancel. Advanced runtime drafts and export remain available; when clipboard access fails, the latest export text opens and is selected for manual copying.
- Humidity setup combines sliders, exact values and a live display preview. Runtime humidity drafts remain separate from the saved guide.
- Optional-switch selection is searchable. Recovery updates an invalid confirmation's explanation but still requires a fresh confirmation before any request.
- VT icon choices include separate manual/automatic windows, Motion, Presence, Follow, power limiting, humidity, temperature-report age and attributed energy/power readings. Provider observations remain read-only; a visible link opens Home Assistant’s native VT settings.
- Reading previews retain source and observation status. VT suggestions require explicit adoption and renewed identity checks; selecting a source never enables a feature or sends a command.
- Typed temperature readings support sensor units and live weather temperature units without conversion. The outside reading does not replace the dial's indoor temperature.
- Request presentation exposes one accessible status message. An uncertain request keeps an uncertain overview tooltip while its transport is unsettled and after late acknowledgement, without relaxing the command guard.
- A confirmed Schedule source can pair with an explicitly mapped Frost/Eco/Comfort/Boost mode. Configured but missing, hidden or degraded mode evidence never falls back to the thermostat or House preset. Optional source guards require each declared pending/error attribute to exist and be null.

RC.4 carries the reviewed beta.8 behavior and subsequent icon refinements. Existing readiness, identity, captured-target, confirmation and no-replay checks remain in force. Native VT feature navigation requires a uniquely verified switch on the same device and config entry; it does not broaden optional-switch eligibility.

## Configuration and rollback

The card type remains `custom:thermal-intelligence-beta-card`, with editor `thermal-intelligence-beta-card-editor` and picker label **Thermal Intelligence Thermostat · RC**. Existing schema-1 and schema-2 configurations, per-card settings and unknown configuration fields remain supported. Advanced export does not save a dashboard.

The `temperature` telemetry kind and `unit_attribute` require beta.8 or RC.4. RC.3 and earlier reject this kind. Keep a compatible saved configuration with its original module before adding temperature rows; rollback must restore both while preserving unrelated dashboard edits. See [configuration](card-configuration.md) and [update and rollback](migration.md).

The `schedule_preset` mapping and `clear_attributes` guards require `61c299a` or a later build containing that change. Earlier RC.4 modules preserve these fields as unknown data without implementing their behavior. Restore a compatible saved configuration with its matching module; do not assume an earlier build enforces the new guards.

## Stable Marketplace and Schedule checks — 18–19 November 2026

The exact `25e47e4b…` module was installed through Marketplace by immutable source commit. On HA 2026.11.2 with VT 10.6.5, inert frontend fixtures covered all sixteen House/Manual/VT/Schedule and Frost/Eco/Comfort/Boost icon combinations. The temporary fixtures were removed. Synthetic coverage also includes conflicting presets, invalid or stale mappings, hidden and disabled modes, editor round trips and preservation of unknown fields.

Real Schedule ownership and confirmed Comfort, Eco and Frost modes passed, followed by a natural five-minute Schedule/Boost period and confirmed return to Comfort. Safari showed the matching combined icons and VT provider details. Original requests, ownership, schedules, policy settings and dashboard configuration were restored; the temporary Boost record was cleared. A fresh-page observation recorded no VT requests.

An installation-specific ownership error initially prevented these handoffs. The configured controller was corrected and independently tested before the successful run; that backend correction is outside this card and is not a TI dependency. A separate startup output fault recovered automatically before testing. The subsequent fifteen-minute witness recorded no native/adapter incidents or observation gaps. Brief transitional Unknown/Pending reports were retained; no settled checkpoint remained Unknown.

These results establish the observed ownership, accepted-intent and display paths for that installation. They do not establish physical heating, uninterrupted restart health, a formal soak, wider-provider support, named-release installation or complete installer recovery. The latest Lab control checks below remain tied to their earlier module.

The current runtime source passed 203 unit, 220 synthetic browser, 14 foundation, 13 package and eight Marketplace checks. Its ten-path change from the preceding reviewed source had a completed scoped security scan with no findings. These are bounded checks, not proof of the absence of all vulnerabilities.

## Latest Lab-tested revision — 17 November 2026

The exact `d7701409…` module above passed bounded Safari checks on HA 2026.11.0. Served bytes matched the committed build, and a fresh document registered the RC.4 card and editor. The combined indicator passed VT, Manual, Policy, Schedule, House, Pending, Unknown, wrong-target and unready-source cases. House Boost remained distinct from the thermostat's Eco preset. The combined visibility switch hid the whole slot in preview; Cancel restored the existing display without a command or dashboard write.

Actual controls covered Generic temperature buttons, keyboard dial, preset and Heat/Off; all four VT presets; optional-switch Cancel/On/Off; and range endpoints, fan and both swing controls. A temporary inert VT auto start/stop feature exposed the correctly bound native switch. Opening its dialog sent no control request; explicit native Off/On actions returned matching states.

All 27 card requests and two native switch requests had acknowledgements and unique matching server events. One negative acknowledgement was the intentional rejection test. Its notice disappeared after 9,997 ms, while the amber LED retained the failure explanation; a successful retry restored normal feedback. No request remained pending. An independent observer spanned the final fresh load without a connection gap and recorded no service replay.

All nine climate control tuples, helper/switch values, saved dashboard configuration, config-entry data/options and active registry identities were restored. Temporary observations and feature entries were removed, and rollback copies were reverified. Protected-file differences were limited to the intended resource URL and provider/registry bookkeeping. The Marketplace package and legacy frontend were preserved. No Core restart or Stable change was made.

The final source passed 199 unit, 205 synthetic browser, 14 foundation, 13 package and eight distribution tests; repeat packages, link/public-data checks, redacted secret checks and source CI passed. Independent product and safety reviews found no outstanding blocker. Scoped static security reviews of both implementation commits reported no findings. These checks do not establish absence of all vulnerabilities.

This is inert-fixture acceptance, not physical heating, Marketplace installation, wider-client or formal-soak acceptance. The loaded VT version was not independently established. Native editor Save/reopen and advanced export retain their earlier live evidence and current synthetic coverage; they were not repeated on these exact bytes. Two temporary browser test-capture errors were corrected during the session; client request evidence and the independent server observer remained available. The previous `f822b133…` intermediate build was superseded during this trial and is not the accepted module.

## Earlier Lab-tested revision — 16 November 2026

That module is 243670 bytes, SHA-256 `8ffca1f7a4636862cd754cb588f6ab50b4ded7748215d40aeb981582c4fc0b2c`, built from `20fcd0b40b2208cd0669b5dc349409a7bb44df5a`. Lab testing found one Safari usability issue: the first manual-copy fallback selected the configuration without reliably revealing it. The corrected dialog focuses, selects and scrolls the export into view after its status layout settles. The first-copy path passed again in Safari. All 184 unit, 186 browser, 14 foundation, 13 package and eight distribution checks passed, with public-data and redacted secret checks.

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
