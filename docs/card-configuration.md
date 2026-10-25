# Card configuration and local preview

This document describes the implemented development preview. Home Assistant **2026.10.x** and Versatile Thermostat **10.5.1** are intended contract targets. Current validation uses synthetic fixtures; it does not establish a live installation, supported version range, physical heating response or product release.

The card presents a selected climate entity, its advertised controls and explicit optional observations. It does not need a TI backend, create schedules or take ownership of an existing controller. See the [provider contracts](provider-contracts.md) for capability and evidence rules, and the [command contract](command-contract.md) for request tracking and uncertainty.

## Run the synthetic preview

Use Node.js 22 or newer. From the repository root:

```sh
npm ci
npm run build
npm run preview
```

Open [the local preview](http://127.0.0.1:4173). The server listens on the loopback interface at port `4173`; the page uses local synthetic state and a service recorder. It does not connect to Home Assistant or control physical devices. Stop the server with `Ctrl+C`.

The build writes the self-contained module to `dist/thermal-intelligence.js`. After source edits, run `npm run build` again and reload the page; the preview command does not rebuild or watch source files. If port `4173` is occupied, start a separate port with `TI_PREVIEW_PORT=4174 npm run preview` and open the printed address.

The fixture selector provides standard Celsius, standard Fahrenheit, temperature range with fan/swing, ready VT, initializing VT, unavailable climate and no-climate setup scenarios. Changing the scenario resets its configuration and request recorder. These names describe simulated behavior, not tested provider installations.

The page places the card beside its visual editor. Accepted editor changes update the card and the **Saved card configuration** panel. The **Recorded service requests** panel records deliberate runtime controls. Toggle **Preview / edit safety** to exercise the read-only preview state: configuration changes should remain usable while thermostat controls are disabled. The fixture's service acknowledgement and subsequent matching state are separate events; neither represents physical heating.

Run the repository's synthetic unit checks with:

```sh
npm test
```

This workflow is for local development. Installation, update, rollback and release acceptance are separate work described in [distribution](distribution.md) and [compatibility](compatibility.md).

## Visual configuration

Ordinary configuration is available through the visual editor:

1. In **Thermostat**, select a climate entity and provider mode. Set the card name, appearance, activity visibility and details visibility.
2. In **Optional telemetry**, add sources, select their kinds, enter exact entities and optional attribute paths, and set labels, units or maximum ages. Rows can be reordered or removed. A blank source disables that row.
3. In **Preset display labels**, change the labels for advertised presets or add an exact provider-value mapping. Reset removes a label override. Saved mappings for currently unadvertised values remain editable.
4. In **Advanced display settings**, set a fallback temperature step or local humidity display bounds. Both humidity bounds must be valid before they apply; **Clear humidity colour preference** removes the preference.

Fields validate before emitting an accepted configuration. An incomplete or invalid draft shows an error and leaves the card on its last accepted configuration. The no-climate scenario remains a usable setup state. Configuration belongs to each card instance; editing one card does not update other copies.

The YAML below describes the same configuration contract. The preview shows the normalized configuration as JSON; it does not include a YAML importer. Type and schema version are managed by the card and editor rather than exposed as ordinary display settings.

## Top-level options

| YAML key | Visual field | Default | Accepted value and behavior |
| --- | --- | --- | --- |
| `type` | Managed by the card | `custom:thermal-intelligence-card` | This exact card type. Include it in a complete YAML configuration. |
| `schema_version` | Managed by the card | `1` | Numeric `1`. Unsupported versions are rejected. |
| `entity` | Thermostat entity | Empty string | A `climate.*` entity ID. Empty is the safe setup state. Entity names do not establish provider identity. |
| `adapter` | Provider | `auto` | `auto`, `standard` or `vtherm`; see identity rules below. |
| `name` | Card name | No override | Plain text. When omitted or empty, use the entity's friendly name, then its entity ID. |
| `theme` | Appearance | `auto` | `auto` follows HA theme variables; `light` or `dark` chooses the card palette. |
| `show_activity` | Show activity | `true` | Boolean. Show the separate integration-reported activity and its attribution. |
| `show_details` | Show details | `true` | Boolean. Show the details button for provider evidence, readiness, ownership, step and applicable provider observations. |
| `step` | Temperature step override | Unset | Finite positive number, used only when the provider omits `target_temp_step`. It does not override a reported provider step. |
| `preset_labels` | Preset display labels | `{}` | Object mapping exact provider preset values to plain-text display labels. Does not add capabilities or change service values. |
| `telemetry` | Optional telemetry | `[]` | Ordered list of explicit source rows; see fields and kinds below. |
| `humidity_bands` | Humidity display low/high | Unset | Object containing finite numeric `low` and `high`, with `0 ≤ low < high ≤ 100`. Local display classification only. |

Names, labels, units and preset keys must be plain text without markup delimiters or control characters. Optional numbers use YAML numbers, not quoted numeric strings. Boolean options use `true` or `false`. Clear an optional setting by omitting it; `null` is not a substitute for a valid recognized value.

Unknown top-level options, unknown fields within telemetry rows, and unknown fields within `humidity_bands` survive normalization and editor round trips. Preservation does not make an unknown option operational. The editor patches the selected field instead of rebuilding a reduced configuration. There are no implicit private entity bindings or shared card settings.

## Provider selection and temperature behavior

`auto` requires matching entity-registry evidence. While the registry lookup is pending or unavailable, an automatically selected provider cannot enable controls. An explicit `standard` or `vtherm` choice can identify an unregistered entity, but it cannot override conflicting registry evidence. A registry-identified VT always retains VT readiness restrictions, even if the configuration requests `standard`.

Identity lookup is tied to the active connection, socket and user session. A session change invalidates the previous lookup; reconnecting retries identity checks without replaying commands. Remembered VT restrictions stay scoped to their connection, preventing an unavailable lookup from silently relaxing a known provider's readiness requirements.

VT requires literal boolean `is_ready: true`. Unknown readiness, initialization in progress, applicable user locking, an unavailable climate entity or a disconnected session disables dependent controls. The model does not relax these restrictions to make a control appear usable.

Temperature units come from HA's configured display unit (`°C` or `°F`). Limits, targets and advertised step come from the climate entity. If no step is advertised, `step` supplies a fallback; if neither exists, the display increment is `0.5°C` or `1°F`. A malformed advertised step does not silently fall back. The details view identifies the step's source.

The card quantizes target edits to the valid step grid within the provider limits. A range edit preserves the other endpoint and cannot cross it. Unknown units or invalid temperature data disable temperature editing; independently valid mode or preset controls can remain available. No configuration option invents a temperature range, preset, fan mode or swing capability.

Frost is selectable only if the provider advertises its exact preset value. For example, `preset_labels: {frost: Frost}` changes that value's display label; it neither creates Frost support nor maps an unrelated preset to a different service value. Preset `none` and a coincident target temperature do not establish manual ownership or the absence of a schedule.

## Telemetry row fields

| Field | Required / default | Meaning |
| --- | --- | --- |
| `kind` | Required | `humidity`, `trend`, `valve`, `energy`, `power` or `custom`. |
| `entity` | Required | Exact HA entity ID, or `""` for a disabled row. Any entity domain can supply an observation. |
| `attribute` | Optional; entity state | Dot-separated attribute path, such as `diagnostics.temperature_slope`. Only own properties are read. |
| `label` | Optional; kind label | Display label. Defaults are Humidity, Temperature trend, Valve, Energy, Power or Telemetry. |
| `unit` | Optional; reported state unit | Explicit unit for a value that has no state-unit metadata, particularly an attribute. It never requests a conversion. |
| `max_age_seconds` | Optional; no age limit | Finite positive number. Compares the entity's `last_updated` with observation time. Choose it from the source's reporting behavior. |

The entity's `unit_of_measurement` describes its state. It is not automatically applied to a nested attribute, so typed numeric attribute observations need an explicit unit. If both an entity-state unit and a configured unit exist, they must match. `__proto__`, `constructor` and `prototype` are prohibited attribute-path components.

| Kind | Valid data | Default label |
| --- | --- | --- |
| `humidity` | Finite percentage from 0 to 100; unit `%` | Humidity |
| `trend` | Finite signed value; `°C/h`, `°F/h`, `°C/min` or `°F/min` | Temperature trend |
| `valve` | Finite percentage from 0 to 100; unit `%` | Valve |
| `energy` | Finite value; `Wh`, `kWh`, `MWh`, `J`, `kJ`, `MJ` or `GJ` | Energy |
| `power` | Finite value; `W`, `kW` or `MW` | Power |
| `custom` | Finite number or reported text; optional unit | Telemetry |

A missing entity or expected attribute is unavailable. Provider `unknown` values remain unknown; incompatible units or malformed numeric values are invalid. A blank entity is disabled. With an explicit maximum age, old data becomes stale and a missing or future timestamp makes freshness unknown. Without a maximum age, the card does not invent a timeout. `last_updated` is an HA entity-update timestamp, not proof of when a physical sensor sampled its environment.

Each source degrades independently. Missing humidity does not disable temperature control. A reported valve percentage is not proof of heat delivery, and a trend is not a prediction. These observations do not create a new controller or writer.

Each displayed row identifies its configured entity and optional attribute path alongside its status. This attribution remains distinct from the row's display label and from any local humidity-band classification.

## Complete synthetic example

This example uses entity IDs present in the bundled fixture. All identifiers are synthetic. It exercises the implemented top-level settings and every telemetry-row field without requiring extra entities:

```yaml
type: custom:thermal-intelligence-card
schema_version: 1
entity: climate.fixture_thermostat
adapter: auto
name: Example thermostat
theme: light
show_activity: true
show_details: true
step: 0.25
preset_labels:
  none: No preset
  eco: Eco
  comfort: Comfort
  frost: Frost
humidity_bands:
  low: 35
  high: 65
telemetry:
  - kind: humidity
    entity: sensor.fixture_humidity
    label: Reported humidity
    unit: "%"
    max_age_seconds: 300
  - kind: valve
    entity: sensor.fixture_valve
    label: Reported valve position
    unit: "%"
  - kind: custom
    entity: climate.fixture_thermostat
    attribute: hvac_action
    label: Provider activity value
```

The fixture advertises its own temperature step, so the example's `step: 0.25` remains a fallback. Its preset list is synthetic and does not imply that every real standard thermostat supports Frost. The maximum age deliberately makes a humidity row stale if the fixture value is not refreshed within five minutes.

For an empty setup state, the minimal configuration is:

```yaml
type: custom:thermal-intelligence-card
entity: ""
```

For an explicit provider configuration, set `adapter: standard` or `adapter: vtherm` in a valid configuration. Changing that option configures presentation and validation only; it does not initialize, switch or reconfigure the underlying integration.

## Display preferences and operating limits

Humidity values below `low`, above `high`, or between the inclusive bounds are classified as below, above or within a **Local display band**. These are presentation preferences. They are not HI seasonal targets, Stability, lanes, controller reasons or safety thresholds. This preview has no automatic HI contract or HI service path.

Activity is kept separate from mode, preset and ownership. Standard `hvac_action` is integration-reported activity; VT `heating` is presented as **Heat requested**, with physical heat delivery unverified. Ownership remains unknown without an authoritative ownership contract.

When details are enabled, applicable VT regulation observations include the provider's climate regulation mode/internal target or proportional function/demand and requested valve opening. These are read-only, type-gated observations with their own sources and availability states. The internal target retains its provider-declared unit, and requested valve opening is distinct from a measured valve-position source. See the [VT detail contract](provider-contracts.md#activity-and-vt-details) for exact paths and limitations; there is no regulation-setting control in this preview.

Only deliberate runtime controls may request a supported service. Setup, visual editing, preview, configuration saves, rendering and reconnection do not request heating writes. Requests retain their captured target; acknowledgement, matching state and physical behavior are distinct. Uncertain outcomes are displayed and are not automatically replayed. See the [command lifecycle](command-contract.md) for exact behavior.

Mouse and keyboard temperature drafts share context checks. A concurrent target, unit, mode, provider, readiness, configuration or session change cancels the draft instead of sending an edit derived from outdated context.

The local preview cannot establish authenticated HA onboarding, live registry behavior, real provider compatibility, HACS installation, cache/update recovery, physical phone/tablet interaction or heating-device response. Those need separate evidence against an identified candidate before support or release claims change.
