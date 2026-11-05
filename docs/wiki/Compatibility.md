# Compatibility

Current beta candidate: **0.1.0-beta.5**. The [beta.5 guide](https://github.com/senyo888/thermal-intelligence/blob/senyo888-patch-1/docs/beta-5.md) records its exact identity and limits. The table below retains historical beta.4 evidence, not beta.5 live acceptance. A minimum supported version range is not established.

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
| Other climate integrations | Provisional; require integration-specific checks |
| Physical heating response | Unverified; activity and valve readings do not prove heat delivery |

Beta.4 passed **135 unit tests, 81 browser tests and 5 packaging tests**. Coverage includes configuration preservation, provider identity and readiness, command races, no replay after reconnect, escaped rendering and degraded observations. The built module's health checks retain amber for incomplete observations and red for disconnected or unavailable thermostats. A completed scoped security review reported no findings.

These results apply to the recorded versions and scenarios. They do not establish compatibility with every thermostat, browser or Home Assistant release.

## Report a compatibility issue

Include your TI, Home Assistant, provider and browser/Companion versions, installation method, a minimal redacted card configuration and reproduction steps. State whether the issue affects rendering, controls, provider observations or resource loading. Use the [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose).
