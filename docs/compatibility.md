# Compatibility

Current published prerelease: **0.1.0-rc.3**. [RC.3](rc-3.md) corrects request ordering, configuration editing and presentation while preserving schema-1/schema-2 configurations and existing control restrictions.

On 13 November 2026, the exact released module passed passive manual Lab checks on HA 2026.11.0: six inert fixture renders, humidity editing/manual export, clearing a visual valve mapping and browser reconnect, with no observed thermostat commands or observation gaps. The independent observation exceeded its planned five-minute limit, lasting about 10 minutes 43 seconds. This is a pass for the completed checks, not full timing-plan compliance or a soak. See the [exact package and validation limits](rc-3.md#validation-limits).

The Lab used a manual overlay while Marketplace retained RC.2. RC.3 named-release Marketplace acceptance, physical clients, wider providers, installer update/removal/recovery and backup restore rehearsal remain incomplete. Explicitly empty YAML valve sources, range controls and delayed clipboard/stale-registry cases retain synthetic or historical coverage. A minimum supported HA version has not been established.

## Unreleased RC.4 candidate

The latest working revision adds a dedicated top-row icon page and an expanded VT reading catalogue. The runtime page supports preview and export; Home Assistant’s selected-card editor owns saving. No runtime dashboard writes are made. The final `8ffca1…` module passed bounded Lab icon, button and rejection/recovery checks on 16 November, including a Safari manual-copy visibility fix. All 21 explicit requests had acknowledgements and server matches; fixture settings and the dashboard were restored. Exact identities, the preceding module's native-editor checks and the unverified loaded VT version are recorded in [RC.4](rc-4.md#latest-lab-tested-revision--16-november-2026). Stable was not changed.

The preceding 16 November revision uses quiet button feedback: routine actions leave no banner, issue notices expire after ten seconds, and unresolved issues remain on the LED and in the overview. Module SHA256 `718e6f5f076c9471bbc6a634fa3dd515255a02c1db7365d3d982d65a6cdc3cff` passed 178 unit and 171 synthetic browser tests. These bytes have not been loaded on HA Lab or Stable; the live results below remain tied to the earlier module.

The earlier [RC.4](rc-4.md) module consolidates beta.8 usability improvements and the request-tooltip correction. Its SHA256 is `c5c88f6f662095f1bd0a11254bea1401c2ff8b15a13da500d894fdbb664130ae`. It passed 178 unit, 164 synthetic browser, 14 foundation, 13 package and eight Marketplace distribution tests, including phone/tablet/desktop layouts and preserved advanced export. It remains on the beta branch for future develop reconciliation, without a named release.

On 15 November 2026, those exact bytes passed manual Lab checks on HA 2026.11.0 with VT 10.6.4: editor Save/Cancel and export, Generic/VT controls, an eligible inert optional switch, range/fan/swing controls and deliberate error paths. All 35 card requests and eight fixture setup/restoration requests had acknowledgements and independent server events, including two intended rejections. Original fixture settings and saved configurations were restored; no card-runtime defect was found. At that trial, RC.4 used a manual resource overlay while Marketplace retained RC.2. See [coverage and limits](rc-4.md#validation-limits); physical-device, installer and formal-soak acceptance remain separate.

## Unreleased beta.8 usability candidate

The candidate adds visible press feedback, a clearer HA editor route, humidity editor controls, searchable switch selection, verified source suggestions and typed temperature observations. Synthetic fixtures cover phone, tablet and desktop widths, reduced motion and command recording.

On 15 November 2026, module SHA256 `84e380283e159a93ca98ce51d53867d9ba34ef901cb50313bc7dca883e7fc936` passed bounded passive checks on HA 2026.11.0: six inert cards, visible button activation, manual export, humidity preview/reset, switch search, weather temperature preview, explicit VT source adoption into a draft, and Home Assistant Save/Cancel. A temporary card-name change persisted across a fresh frontend connection and was restored exactly. Independent observation recorded no service calls, frontend errors or observation gaps. An earlier build exposed a collapsed clipboard fallback; it was rolled back, corrected and retested.

The manual overlay remains separate from the installed Marketplace package. Physical phone/tablet and Companion acceptance, wider providers, installer lifecycle, physical heating, backup restore rehearsal and formal soak remain unverified for beta.8. Published RC.3 evidence above does not apply to these bytes.

Switch search uses a labelled search input and native select. No undocumented HA picker API or new minimum HA version is assumed. Source suggestions require registry access; failure leaves manual mapping available. Slope suggestions use the VT registry role, config entry and device association and require a compatible live numeric observation. Temperature telemetry requires the new module; restore compatible configuration and module together on rollback.

### Inert control checks — 15 November 2026

The same beta.8 module also passed control checks on a Generic Thermostat and a switch-based VT, whose outputs were verified to lead only to software helpers. The corrected observation recorded 22 deliberate requests, each with a positive service acknowledgement, an independent service event and a matching reported setting.

| Control | Observed result |
| --- | --- |
| Temperature buttons | Increment and decrement reached the requested target on both providers. |
| Generic dial | Keyboard and pointer adjustments committed correctly and were restored. |
| Presets and HVAC mode | Both providers accepted preset changes and Heat/Off; original modes, presets and targets were restored. |
| VT locking | Dialog cancellation sent nothing. Explicit unlock/lock succeeded; automatic relocking invalidated an old action without sending a redundant request. Locked controls stayed disabled. |
| Reconnect and preservation | A fresh document loaded six cards without replaying commands. Saved dashboards, resources, protected configuration and output-helper states were preserved or restored. |

An initial test recorder missed acknowledgements delivered in batched WebSocket frames. Its decoder was corrected and the affected control paths were repeated; no card-runtime defect was found. At that stage, the available Lab switches were template or VT entities, which are ineligible for optional switch enrollment. The subsequent optional-switch checks are recorded below. Range, fan/swing, interrupted-draft and forced transport-failure cases were not exercised in this live test. These are bounded fixture results, not physical heating, installer or soak acceptance.

### Optional switch checks — 15 November 2026

A registered Command Line switch with local file readback and no physical output was enrolled through the visual editor beside an inert Generic Thermostat on HA 2026.11.0. Initial checks found that an invalid confirmation retained an unavailable-state explanation after the switch recovered. The correction updates that explanation while keeping the confirmation disabled.

Corrected module SHA256 `66b247fe500a959c79dcb2c288174c4250ca27b15ac64e2dec49fbc0702f4235`, built from [source `5278a26`](https://github.com/senyo888/thermal-intelligence/commit/5278a26e4e04085fe171a71b21a620d732b4cd07), passed the repeated recovery check, fresh confirmed On/Off, cancellation and a fresh frontend connection. The observed sequence was Pending → Accepted → Observed. Two deliberate requests each had a positive acknowledgement, an independent service event and matching software readback. Recovery and reconnect sent no commands; the fixture finished Off. Existing dashboard content, unrelated resources and thermostat settings were preserved.

The corrected observation lasted about 4 minutes 26 seconds with no recorded frontend errors or observation gaps. This manual overlay trial establishes the inert switch's frontend and service path. It does not establish physical response, real Honeywell behavior, provider-wide health, installer lifecycle or formal soak acceptance. The broader beta.8 display and thermostat checks above retain their original module identity.

### Range and error-path checks — 15 November 2026

Module SHA256 `66b247fe500a959c79dcb2c288174c4250ca27b15ac64e2dec49fbc0702f4235` was tested on a dedicated Template climate with local helper readback and no physical outputs, on HA 2026.11.0.

| Path | Observed result |
| --- | --- |
| Range controls | Buttons sent both endpoints; keyboard Home/End respected limits and the other endpoint. Unchanged boundary presses sent nothing. |
| Fan and swing | Advertised fan modes and both swing directions reached the selected settings and returned to their starting values. |
| Service rejection | Negative acknowledgement produced failure, including when matching state arrived before the rejection. |
| Missing or delayed readback | Acknowledgement without a state change became uncertain. A delayed response kept controls busy until transport settled and did not upgrade the timed-out request to success. |
| Invalid or unavailable state | Crossed ranges and unavailable entities disabled affected controls; recovery sent no commands. |
| Interrupted input and connection | A concurrent target change cancelled a held-key draft without dispatch. Closing the frontend connection during an in-flight request caused no replay; HA reconstructed the card and resynchronised current state. The new instance does not retain the old request's history. |

The first pass recorded 23 deliberate climate requests: 20 positive acknowledgements, two intentional rejections and one acknowledgement lost during the deliberate frontend disconnect. Independent server observation recorded all 23 service events and the delayed state change after disconnect. Fixture setup calls were counted separately.

The held-key test exposed duplicate accessible status text. [Source `5851fcf`](https://github.com/senyo888/thermal-intelligence/commit/5851fcf71bc2f0f3ccba1e112644bf6847c83a05) corrects only that rendering. The corrected module, SHA256 `b6d1a2a9c6c0639a255e14ac7a25b56bb3cf55de6a7a5a22339a3eb8bcb145bd`, passed a focused Lab retest of cancellation, pending/uncertain feedback and a fresh Off action. Each captured status had one accessible status region; the cancelled draft sent nothing. All three deliberate retest requests had positive acknowledgements and independent service events. Actual screen-reader speech was not tested.

The inert fixture finished Off with its original range, fan and swing settings. Existing thermostat settings, provider configuration and dashboard content were preserved. These are bounded manual overlay checks, not provider-wide permissions, physical-device response, installer lifecycle, backup restore or formal soak acceptance. Earlier checks retain their original module identities.

## Historical RC.2 validation

The [dated RC.2 record](rc2-validation.md) covers its exact package, Marketplace Lab installation and two-card trial on HA 2026.11.1 with VT 10.6.4 plus local provider extensions. Both cards passed bounded controls and followed a natural 25-minute house-policy Boost return, with 16m38s of subsequent observation. The maintainer confirmed physical heating for that RC.2 trial.

One external output adapter was unavailable for about 10m16s before automatic recovery. This is not an uninterrupted controller-health pass or a formal soak. These RC.2 observations do not establish RC.3 physical or installer acceptance.

## Historical beta.4 and RC.1 baseline

The following table and results describe their original builds and observation periods. Later RC.2 evidence above does not retroactively validate them.

| Environment or feature | Coverage |
| --- | --- |
| Home Assistant 2026.10.0 · VT 10.5.1 | Dedicated test environment with Generic Thermostat, VT switch, climate, valve and combined climate/valve configurations using inert outputs |
| Home Assistant 2026.10.4 · VT 10.5.1 | Passive frontend trial alongside existing TI cards; beta.4 readings, health LED and provider details checked |
| Installation and rollback | Manual resource installation, removal/reinstallation, update, rollback and reapplication exercised in the test environment |
| VT lock without a code | Deliberate native Lock/Unlock and provider automatic relocking checked on an inert fixture |
| VT lock code/error paths | Synthetic tests only; see [provider logging limitation](lock-control.md#code-handling-and-provider-limits) |
| VT response arc | Synthetic positive, restricted, mismatching, stale and expired evidence; real HA checks cover unmapped configurations |
| Phone, tablet and desktop widths | Responsive Chromium fixtures, keyboard and reduced-motion checks; physical devices and Companion apps remain unverified |
| HACS | Installation, updates and catalogue inclusion are unverified |
| Home Assistant Marketplace | HA 2026.11.0b1 source reviewed; metadata and offline package checks prepared. Installation, migration, update and recovery remain unverified; see [Distribution](distribution.md) |
| Other climate integrations | Provisional; require integration-specific checks |
| Physical heating response | Unverified; activity and valve readings do not prove heat delivery |

Beta.4 passed **135 unit tests, 81 browser tests and 5 packaging tests**. Coverage includes configuration preservation, provider identity and readiness, command races, no replay after reconnect, escaped rendering and degraded observations. The built module's health checks retain amber for incomplete observations and red for disconnected or unavailable thermostats. A completed scoped security review reported no findings.

These results apply to the recorded versions and scenarios. They do not establish compatibility with every thermostat, browser or Home Assistant release.

RC.1 changes release identity and packaging; it does not change thermostat commands, provider interpretation, response-arc rules or the health LED. A timed RC observation must record its own build identity, start and checkpoints. Historical beta checks do not count as an RC soak.

## Report a compatibility issue

Include your TI, Home Assistant, provider and browser/Companion versions, installation method, a minimal redacted card configuration and reproduction steps. State whether the issue affects rendering, controls, provider observations or resource loading. Use the [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose).

## Beta.5 disabled-lock correction

The correction covers VT reporting `is_lock_configured: false` with a residual true locked flag, plus unknown configuration and removal while a lock dialog is open. Synthetic source and built-module checks are recorded in the [beta.5 guide](beta-5.md). No beta.5 installation, physical control or HACS lifecycle acceptance is claimed.

## Optional switch development coverage

The optional control targets one registered standard climate plus one registered switch, with both-direction confirmation and visual enrollment. Synthetic fixtures cover Honeywell-like On/emergency-heat and Off/system-Off effects, unknown identity/state, registry/session invalidation and explicit-target request ordering. This is not real Honeywell, HACS/Marketplace or physical-device acceptance. Unsupported helpers, VT, group/template switches and multiple mappings remain explicit. Accounts unable to read/subscribe to the entity registry cannot use this optional row.

## Beta.6 observations and beta.7 correction

On HA 2026.11.0 with VT 10.6.3, a manual beta.6 trial passed passive rendering, editor cancellation and browser reconnect checks. An inert VT fixture confirmed that explicitly disabled locking permits deliberate temperature changes and that restoring the original lock settings blocks them again. These checks do not prove physical heating or installer lifecycle behavior.

The optional switch test found that HA frontend metadata used an own `device_id: undefined` while its registry API returned `device_id: null`. Beta.6 falsely reported unavailable registry proof. Beta.7 accepts only those equivalent absent device IDs; actual device changes and other identity mismatches remain blocked. Synthetic tests cover both selected entities and confirmation invalidation.

## Beta.7 Lab acceptance — 6 November 2026

The [exact beta.7 module](beta-7.md#exact-package) was manually installed on HA **2026.11.0** with VT **10.6.3**. A registered generic thermostat and a dedicated built-in Command Line switch both exposed the absent device-ID shapes above; registry proof was verified for both. The switch ran only inert commands and reported state optimistically, with no physical device attached.

| Check | Recorded result |
| --- | --- |
| Passive rendering and editor open/cancel | No TI service requests in the monitored window |
| Confirmation cancellation | No request; the fixture remained Off |
| Confirmed On and Off | Each sent one TI request and one corresponding HA service event; acknowledgement plus a newer matching switch state reached the observed result |
| Passive reconnect | Current attached card regained registry proof; no replay |
| Thermostat commands during the isolated functional test | None observed |
| Cleanup and coexistence | Temporary fixture and enrollment removed; original dashboard configuration restored; other resources and legacy TI preserved |

One Core restart loaded the test fixture; a frontend module update itself does not require a Core restart. Startup/provider events and the later fixture cleanup reload were recorded separately from the functional On/Off pair. These results do not claim globally zero climate activity or uninterrupted observation during the restart.

At the end of the recorded interval, HA was connected, Repairs was empty and the captured log response had no ERROR records. Startup output-availability warnings recovered within the interval; known VT native-temperature deprecation warnings remained. This is dated, bounded health evidence, not a warning-free or continuous-uptime claim.

The test establishes the real-HA registry, frontend and service path for this inert fixture. Its reported state is not independent physical feedback or proof of causation. Real Honeywell behavior, broader backend permissions, physical phone/tablet and Companion acceptance, HACS/Marketplace installer lifecycle, backup restore rehearsal and a new controller-managed soak remain unverified. TI remains a standalone card; the Lab controller is test infrastructure, not a product dependency.

## RC.2 acceptance boundary

Named-release Marketplace selection, passive installation checks, bounded controls and maintainer-observed heating now have [dated RC.2 evidence](rc2-validation.md). Earlier beta.7 inert-switch tests remain specific to beta.7. Default catalogue admission, wider physical-device support, a formal RC.2 soak and complete update/removal/recovery acceptance are not established.

## Unreleased RC.4 control-icon refinement

The current patch adds exact advertised preset indicators, read-only ownership/House/schedule mappings, a combined source/preset icon with VT and circled-P marks, VT outside temperature and auto start/stop observations. The latter uses the inspected VT 10.6.5 attribute shape and opens only a uniquely verified same-device/config-entry native switch. It does not broaden ordinary optional-switch eligibility.

Synthetic browser coverage includes state separation, acknowledgement without observation, contrary-preset retirement, wrong/missing registry targets, delayed replies after context loss, native-editor mapping round trips, and phone/tablet/desktop plus a 250px card layout. The native-link test verifies the emitted Home Assistant event and zero TI service calls; it does not test Home Assistant's subsequent switch action. No new Lab or Stable installation, physical response or formal soak acceptance is claimed. Existing acceptance applies to its original hashes.
