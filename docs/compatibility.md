# Compatibility

Published beta candidate: **0.1.0-beta.7**, correcting an absent-device-ID mismatch in [optional switch controls](optional-switch-control.md). The [beta.7 guide](beta-7.md) records the exact package and validation limits; the [beta.6 guide](beta-6.md) preserves the previous identity. Beta.7 live acceptance is pending. The table below records historical beta.4 evidence; beta.6 observations are listed separately. A minimum supported Home Assistant version and a broader support range have not yet been established.

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

## Report a compatibility issue

Include your TI, Home Assistant, provider and browser/Companion versions, installation method, a minimal redacted card configuration and reproduction steps. State whether the issue affects rendering, controls, provider observations or resource loading. Use the [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose).

## Beta.5 disabled-lock correction

The correction covers VT reporting `is_lock_configured: false` with a residual true locked flag, plus unknown configuration and removal while a lock dialog is open. Synthetic source and built-module checks are recorded in the [beta.5 guide](beta-5.md). No beta.5 installation, physical control or HACS lifecycle acceptance is claimed.

## Optional switch development coverage

The optional control targets one registered standard climate plus one registered switch, with both-direction confirmation and visual enrollment. Synthetic fixtures cover Honeywell-like On/emergency-heat and Off/system-Off effects, unknown identity/state, registry/session invalidation and explicit-target request ordering. This is not real Honeywell, HACS/Marketplace or physical-device acceptance. Unsupported helpers, VT, group/template switches and multiple mappings remain explicit. Accounts unable to read/subscribe to the entity registry cannot use this optional row.

## Beta.6 observations and beta.7 correction

On HA 2026.11.0 with VT 10.6.3, a manual beta.6 trial passed passive rendering, editor cancellation and browser reconnect checks. An inert VT fixture confirmed that explicitly disabled locking permits deliberate temperature changes and that restoring the original lock settings blocks them again. These checks do not prove physical heating or installer lifecycle behavior.

The optional switch test found that HA frontend metadata used an own `device_id: undefined` while its registry API returned `device_id: null`. Beta.6 falsely reported unavailable registry proof. Beta.7 accepts only those equivalent absent device IDs; actual device changes and other identity mismatches remain blocked. Synthetic tests cover both selected entities and confirmation invalidation. A dedicated eligible switch is still needed for positive live On/Off acceptance.
