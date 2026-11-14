# Compatibility

Current published prerelease: **0.1.0-rc.3**. [RC.3](https://github.com/senyo888/thermal-intelligence/blob/main/docs/rc-3.md) corrects request ordering, configuration editing and presentation while preserving schema-1/schema-2 configurations and existing control restrictions.

On 13 November 2026, the exact released module passed passive manual Lab checks on HA 2026.11.0: six inert fixture renders, humidity editing/manual export, clearing a visual valve mapping and browser reconnect, with no observed thermostat commands or observation gaps. The independent observation exceeded its planned five-minute limit, lasting about 10 minutes 43 seconds. This is a pass for the completed checks, not full timing-plan compliance or a soak. See the [exact package and validation limits](https://github.com/senyo888/thermal-intelligence/blob/main/docs/rc-3.md#validation-limits).

The Lab used a manual overlay while Marketplace retained RC.2. RC.3 named-release Marketplace acceptance, physical clients, wider providers, installer update/removal/recovery and backup restore rehearsal remain incomplete. Explicitly empty YAML valve sources, range controls and delayed clipboard/stale-registry cases retain synthetic or historical coverage. A minimum supported HA version has not been established.

## Historical RC.2 validation

The [dated RC.2 record](https://github.com/senyo888/thermal-intelligence/blob/main/docs/rc2-validation.md) covers its exact package, Marketplace Lab installation and two-card trial on HA 2026.11.1 with VT 10.6.4 plus local provider extensions. Both cards passed bounded controls and followed a natural 25-minute house-policy Boost return, with 16m38s of subsequent observation. The maintainer confirmed physical heating for that RC.2 trial.

One external output adapter was unavailable for about 10m16s before automatic recovery. This is not an uninterrupted controller-health pass or a formal soak. These RC.2 observations do not establish RC.3 physical or installer acceptance.

## Historical beta.4 and RC.1 baseline

The following table and results describe their original builds and observation periods. Later RC.2 evidence above does not retroactively validate them.

| Environment or feature | Coverage |
| --- | --- |
| Home Assistant 2026.10.0 · VT 10.5.1 | Dedicated test environment with Generic Thermostat, VT switch, climate, valve and combined climate/valve configurations using inert outputs |
| Home Assistant 2026.10.4 · VT 10.5.1 | Passive frontend trial alongside existing TI cards; beta.4 readings, health LED and provider details checked |
| Installation and rollback | Manual resource installation, removal/reinstallation, update, rollback and reapplication exercised in the test environment |
| VT lock without a code | Deliberate native Lock/Unlock and provider automatic relocking checked on an inert fixture |
| VT lock code/error paths | Synthetic tests only; see [provider logging limitation](https://github.com/senyo888/thermal-intelligence/blob/main/docs/lock-control.md#code-handling-and-provider-limits) |
| VT response arc | Synthetic positive, restricted, mismatching, stale and expired evidence; real HA checks cover unmapped configurations |
| Phone, tablet and desktop widths | Responsive Chromium fixtures, keyboard and reduced-motion checks; physical devices and Companion apps remain unverified |
| HACS | Installation, updates and catalogue inclusion are unverified |
| Home Assistant Marketplace | HA 2026.11.0b1 source reviewed; metadata and offline package checks prepared. Installation, migration, update and recovery remain unverified; see [Distribution](https://github.com/senyo888/thermal-intelligence/blob/main/docs/distribution.md) |
| Other climate integrations | Provisional; require integration-specific checks |
| Physical heating response | Unverified; activity and valve readings do not prove heat delivery |

Beta.4 passed **135 unit tests, 81 browser tests and 5 packaging tests**. Coverage includes configuration preservation, provider identity and readiness, command races, no replay after reconnect, escaped rendering and degraded observations. The built module's health checks retain amber for incomplete observations and red for disconnected or unavailable thermostats. A completed scoped security review reported no findings.

These results apply to the recorded versions and scenarios. They do not establish compatibility with every thermostat, browser or Home Assistant release.

RC.1 changes release identity and packaging; it does not change thermostat commands, provider interpretation, response-arc rules or the health LED. A timed RC observation must record its own build identity, start and checkpoints. Historical beta checks do not count as an RC soak.

## Report a compatibility issue

Include your TI, Home Assistant, provider and browser/Companion versions, installation method, a minimal redacted card configuration and reproduction steps. State whether the issue affects rendering, controls, provider observations or resource loading. Use the [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose).

## Beta.5 disabled-lock correction

The correction covers VT reporting `is_lock_configured: false` with a residual true locked flag, plus unknown configuration and removal while a lock dialog is open. Synthetic source and built-module checks are recorded in the [beta.5 guide](https://github.com/senyo888/thermal-intelligence/blob/main/docs/beta-5.md). No beta.5 installation, physical control or HACS lifecycle acceptance is claimed.

## Optional switch development coverage

The optional control targets one registered standard climate plus one registered switch, with both-direction confirmation and visual enrollment. Synthetic fixtures cover Honeywell-like On/emergency-heat and Off/system-Off effects, unknown identity/state, registry/session invalidation and explicit-target request ordering. This is not real Honeywell, HACS/Marketplace or physical-device acceptance. Unsupported helpers, VT, group/template switches and multiple mappings remain explicit. Accounts unable to read/subscribe to the entity registry cannot use this optional row.

## Beta.6 observations and beta.7 correction

On HA 2026.11.0 with VT 10.6.3, a manual beta.6 trial passed passive rendering, editor cancellation and browser reconnect checks. An inert VT fixture confirmed that explicitly disabled locking permits deliberate temperature changes and that restoring the original lock settings blocks them again. These checks do not prove physical heating or installer lifecycle behavior.

The optional switch test found that HA frontend metadata used an own `device_id: undefined` while its registry API returned `device_id: null`. Beta.6 falsely reported unavailable registry proof. Beta.7 accepts only those equivalent absent device IDs; actual device changes and other identity mismatches remain blocked. Synthetic tests cover both selected entities and confirmation invalidation.

## Beta.7 Lab acceptance — 6 November 2026

The [exact beta.7 module](https://github.com/senyo888/thermal-intelligence/blob/main/docs/beta-7.md#exact-package) was manually installed on HA **2026.11.0** with VT **10.6.3**. A registered generic thermostat and a dedicated built-in Command Line switch both exposed the absent device-ID shapes above; registry proof was verified for both. The switch ran only inert commands and reported state optimistically, with no physical device attached.

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

Named-release Marketplace selection, passive installation checks, bounded controls and maintainer-observed heating now have [dated RC.2 evidence](https://github.com/senyo888/thermal-intelligence/blob/main/docs/rc2-validation.md). Earlier beta.7 inert-switch tests remain specific to beta.7. Default catalogue admission, wider physical-device support, a formal RC.2 soak and complete update/removal/recovery acceptance are not established.
