# Card configuration and local preview

This document describes the implemented development preview. Home Assistant **2026.10.x** and Versatile Thermostat **10.5.1** are intended contract targets. Validation includes synthetic fixtures and scoped test-environment checks. It does not establish a supported version range, physical heating response or product release.

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

1. In **Thermostat**, select a climate entity and provider mode. Set the card name and **Background**: **Midnight Blue**, **Plum** or **Black**. Activity and details visibility remain independent settings.
2. In **Temperature trend, humidity and valve sources**, map the existing card surfaces to explicit sensors. None is required for temperature control.
3. In **Custom telemetry & features**, add named header extras using an entity, optional attribute, label, unit and icon. Optionally associate a temperature source with an exact advertised preset using **Preset association**; **Unassociated** clears that link. Rows can be reordered or removed; a blank source is a disabled setup row.
4. In **Optional telemetry**, add typed sources, exact entities and optional attribute paths, labels, units or maximum ages. This schema remains supported alongside the original `features` mappings.
5. In **Preset display labels**, change the labels for advertised presets or add an exact provider-value mapping. Reset removes a label override. Saved mappings for currently unadvertised values remain editable.
6. In **Advanced display settings**, set a fallback temperature step or the original four humidity display boundaries. Saved legacy low/high guides remain two explicitly labelled fields. **Reset humidity guides to source defaults** restores the original five-band presentation, retaining unknown nested configuration.

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
| `background` | Background | `blue` | `blue` (Midnight Blue), `plum` or `black`, preserving the existing TI palettes. |
| `show_activity` | Show activity | `true` | Boolean. Show the measured trend and reported output summary, with their distinct sources. |
| `show_details` | Show details | `true` | Boolean. Show provider and mapped feature detail rows in expanded **Controls & features**. |
| `step` | Temperature step override | Unset | Finite positive number, used only when the provider omits `target_temp_step`. It does not override a reported provider step. |
| `preset_labels` | Preset display labels | `{}` | Object mapping exact provider preset values to plain-text display labels. Does not add capabilities or change service values. |
| `trend_entity` | Optional trend entity | Unset | Explicit `sensor.*` temperature-trend source; reported units are required. |
| `humidity_entity` | Optional humidity entity | Unset | Explicit `sensor.*` humidity source; finite percentage from 0 to 100 with unit `%`. |
| `valve_position_entity` | Optional TRV opening sensor (%) | Unset | Explicit `sensor.*` valve-position source; finite percentage from 0 to 100 with unit `%`. |
| `features` | Custom telemetry & features | `[]` | Ordered portable named observations for the header and expanded features; fields below. |
| `telemetry` | Optional telemetry | `[]` | Ordered list of explicit source rows; see fields and kinds below. |
| `humidity_bands` | Four humidity guide boundaries, or explicit legacy low/high | Original `30/40/60/70` guides | `{dry_below, good_min, good_max, wet_above}` requires ordered integers within 0–100. Existing `{low, high}` remains an explicit legacy format. Local display classification only; details below. |

Names, labels, units and preset keys must be plain text without markup delimiters or control characters. Optional numbers use YAML numbers, not quoted numeric strings. Boolean options use `true` or `false`. Clear an optional setting by omitting it; `null` is not a substitute for a valid recognized value.

Unknown top-level options, unknown fields within feature/telemetry rows, and unknown fields within `humidity_bands` survive normalization and editor round trips. Preservation does not make an unknown option operational. The editor patches the selected field instead of rebuilding a reduced configuration. There are no implicit private entity bindings or shared card settings.

The earlier local preview's `theme` option is no longer the appearance control. A previously saved valid `auto`, `light` or `dark` value is retained as inert legacy data; it does not select the source UI's background. Choose `background` explicitly or accept Midnight Blue. See [local migration](migration.md#source-ui-configuration-correction).

## Provider selection and temperature behavior

`auto` requires matching entity-registry evidence. While the registry lookup is pending or unavailable, an automatically selected provider cannot enable controls. An explicit `standard` or `vtherm` choice can identify an unregistered entity, but it cannot override conflicting registry evidence. A registry-identified VT always retains VT readiness restrictions, even if the configuration requests `standard`.

Identity lookup is tied to the active connection, socket and user session. A session change invalidates the previous lookup; reconnecting retries identity checks without replaying commands. Remembered VT restrictions stay scoped to their connection, preventing an unavailable lookup from silently relaxing a known provider's readiness requirements.

VT requires literal boolean `is_ready: true`. Unknown readiness, initialization in progress, applicable user locking, an unavailable climate entity or a disconnected session disables dependent controls. The model does not relax these restrictions to make a control appear usable.

Temperature units come from HA's configured display unit (`°C` or `°F`). Limits, targets and advertised step come from the climate entity. If no step is advertised, `step` supplies a fallback; if neither exists, the display increment is `0.5°C` or `1°F`. A malformed advertised step does not silently fall back. The details view identifies the step's source.

The card quantizes target edits to the valid step grid within the provider limits. A range edit preserves the other endpoint and cannot cross it. Unknown units or invalid temperature data disable temperature editing; independently valid mode or preset controls can remain available. No configuration option invents a temperature range, preset, fan mode or swing capability.

Frost is selectable only if the provider advertises its exact preset value. For example, `preset_labels: {frost: Frost}` changes that value's display label; it neither creates Frost support nor maps an unrelated preset to a different service value. Preset `none` and a coincident target temperature do not establish manual ownership or the absence of a schedule.

## Original source mappings and named features

A configured direct source selects its explicit sensor. If the direct key is omitted, the first matching `trend`, `humidity` or `valve` entry in `telemetry` can supply that surface. An explicitly empty direct key disables that mapping; an invalid or unavailable explicit source never triggers a search for a replacement. The editor clears a direct override by removing its key.

When the same entity state is also configured with the matching typed telemetry kind, its declared label, unit checks and maximum age are reused. This prevents a direct mapping from discarding an age limit already set for that observation. Direct source strings have no implicit freshness timeout. Use a matching typed telemetry row when an age limit is appropriate.

The original `features` array is portable named telemetry:

| Feature field | Default | Meaning |
| --- | --- | --- |
| `entity` | Required | Any exact HA entity ID, or `""` for a disabled setup row. |
| `label` | Source name | Plain-text label; an attribute path's final component is the fallback label for attribute observations. |
| `attribute` | Entity state | Optional dot-separated own-property path. Blank means entity state. |
| `unit` | Reported state unit | Optional unit for an attribute or state lacking metadata; no conversion or reinterpretation of a conflicting reported unit. |
| `icon` | Valid source icon or information icon | Named icon such as `mdi:thermometer`. URLs and markup are rejected. |
| `preset` | Unassociated | Optional exact advertised provider preset value. Associates this source with a preset-temperature reading; it never selects the preset or changes its temperature. |

Feature values can be finite numbers, reported text or booleans. Booleans display as **On**/**Off**. Missing, unknown and invalid evidence retains its status. Feature entity names and matching temperatures do not select presets, establish ownership or discover helper contracts. A mapped feature remains an observation; it does not become a service control.

Preset associations require a finite numeric reading and a reported or explicit `°C`/`°F` unit matching the selected climate display unit. No conversion is applied. An attribute source needs an explicit unit. One source may be associated with each exact preset; duplicate associations are invalid instead of choosing one. Unadvertised saved associations remain editable and report unsupported. All supported associated readings remain available for comparison, but a header indicator appears only while connected and ready in **Heat**, with that exact advertised preset selected. Off, other modes, unknown selection and disconnected states suppress preset indicators. Preset `none` and a target matching a preset temperature do not activate an indicator. Unassociated features remain independent observations.

For example, this mapping is explicit and portable; the synthetic number entity must exist in the chosen fixture or installation:

```yaml
type: custom:thermal-intelligence-card
entity: climate.example
features:
  - entity: number.example_comfort_temperature
    label: Comfort
    preset: comfort
    icon: mdi:sofa
```

Measured temperature trend retains the existing TI labels and colours. Values within `±0.05°C/hour` or `±0.09°F/hour` display **Stable**; positive values display **Rising**, negative values **Falling**. The original stronger trend colours apply beyond `±2.5°C/hour` or `±4.5°F/hour`. Per-minute readings use the equivalent hourly rate for this display classification and retain their reported unit. This describes measured temperature change only; it is not HI Stability or proof of heating response. The trend surface is unavailable when its source, current temperature or thermostat readiness is unavailable.

**TRV** stands for **thermostatic radiator valve**. An explicitly mapped valve source retains **TRV Open/Closed** and its reported percentage. An open valve does not establish boiler firing or heat delivery. Without a valve mapping, the output summary uses the selected climate entity's reported activity; known VT heating remains **Heat requested**.

VT's reported lock state appears as a small lock/unlock icon beside the card name. Hover text and an accessible label identify the state; a question-mark lock means the state is unknown or unavailable. The icon is read-only. User controls follow VT's reported lock scope, and missing state for a configured lock keeps them disabled.

The arc preserves the directly evidenced target-comparison colours: below-target cyan, at-target green, more than `0.2` display degrees above target purple, Off muted blue-gray, and reported cooling light cyan. The original green interval runs from the target through `0.2` display degrees above it in either Celsius or Fahrenheit. Connection, readiness, a finite current temperature, known unit, recognized mode and a valid single climate target are required; ranges and invalid or missing evidence stay gray. Comparison uses the selected climate's serialized target and display unit, never an unconverted VT internal target. These colours do not prove physical heating. Warming orange remains unavailable without a public accepted-output and freshness contract, so a known below-target comparison stays cyan even if heating is requested.

## Telemetry row fields

| Field | Required / default | Meaning |
| --- | --- | --- |
| `kind` | Required | `humidity`, `trend`, `valve`, `energy`, `power`, `window`, `motion`, `presence`, `power_management`, `follow` or `custom`. |
| `entity` | Required | Exact HA entity ID, or `""` for a disabled row. Any entity domain can supply an observation. |
| `attribute` | Optional; entity state | Dot-separated attribute path, such as `diagnostics.temperature_slope`. Only own properties are read. |
| `label` | Optional; kind label | Display label. Defaults are Humidity, Temperature trend, Valve, Energy, Power or Telemetry. |
| `unit` | Optional; reported state unit | Explicit unit for a value that has no state-unit metadata, particularly an attribute. It never requests a conversion. |
| `max_age_seconds` | Optional; no age limit | Finite positive number. Compares the entity's `last_updated` with observation time. Choose it from the source's reporting behavior. |

The entity's `unit_of_measurement` describes its state. It is not automatically applied to a nested attribute, so typed numeric attribute observations need an explicit unit. If both an entity-state unit and a configured unit exist, they must match. `__proto__`, `constructor` and `prototype` are prohibited attribute-path components.

| Kind | Valid data | Default label |
| --- | --- | --- |
| `humidity` | Finite percentage from 0 to 100; unit `%` | Humidity |
| `trend` | Finite signed value; `°C/h`, `°F/h`, `°C/hour`, `°C/hr`, `degC/h`, `°F/hour`, `°F/hr`, `°C/min` or `°F/min` | Temperature trend |
| `valve` | Finite percentage from 0 to 100; unit `%` | Valve |
| `energy` | Finite value; `Wh`, `kWh`, `MWh`, `J`, `kJ`, `MJ` or `GJ` | Energy |
| `power` | Finite value; `W`, `kW` or `MW` | Power |
| `window` | `on`/`off`, `open`/`closed`, or boolean; no unit | Window detection: Open / Closed |
| `motion` | `on`/`off`, `detected`/`clear`, or boolean; no unit | Motion detection: Detected / Clear |
| `presence` | `on`/`off`, `home`/`away`/`not_home`, or boolean; no unit | Presence detection: Home / Away |
| `power_management` | `on`/`off`, `limiting`/`normal`, or boolean; no unit | Power management: Limiting / Normal |
| `follow` | `on`/`off` or boolean; no unit | Follow underlying target: On / Off |
| `custom` | Finite number, reported text or boolean; optional unit | Telemetry |

Choose the semantic type in the visual editor to retain the canonical labels, state-dependent window/motion icons and active colours. Open windows and limiting power are amber, detected motion purple, presence at home green and Follow on teal. Inactive readings are muted; unavailable/unknown/invalid/stale observations stay gray. Energy is a cumulative reading, not an activity colour. No type is inferred from a source name or chosen icon.

Tapping these icons opens a focused read-only panel with the same state, observation status, source and a short explanation. Categorical panels omit measurement units. Selecting an icon never enables a VT feature. A mapping to a known VT's window, automatic-window, motion, presence or power-management state checks the corresponding provider configuration flag: false means **Not configured**; absent flags stay unknown.

For example, select `kind: window` and an explicit window binary sensor. To display VT's own window detector instead, select the thermostat entity with `attribute: window_manager.window_state`. These are distinct sources; the card does not treat a separate sensor as proof that VT's window protection is enabled.

### VT Presence and Motion are different features

VT **Presence** selects the home or away temperature for the selected preset. It is intended for household presence; its configured input can be a `person`, `binary_sensor` or `input_boolean`. VT 10.5.1 accepts `on`/`home` as present and `off`/`not_home` as absent. A room occupancy sensor can supply that input, but then its room occupancy drives the home/away temperature choice. A manual target (`none`) is not replaced by an away preset temperature.

VT **Motion** is intended for a room's motion or occupancy sensor. It selects the configured motion/no-motion temperatures only while the **Activity** preset is selected, after VT's configured detection and inactivity delays. When Presence is also configured, Activity uses the home or away version of that selected temperature. In other presets, the motion indicator can change without changing the target.

Map `presence_manager.presence_state` or `motion_manager.motion_state` on the VT entity to show VT's accepted feature state. A directly mapped binary sensor shows the raw input instead, potentially before VT's delay has elapsed. Home/Away is a temperature-selection label, not proof of whole-house occupancy, control ownership or alarm state.

For exact VT window/motion/presence manager mappings, TI also checks the input entity ID explicitly reported by that manager. A missing, unknown or unavailable input prevents an old retained detector state appearing as a current reading. The popup explains the input failure; it does not alter VT's control or substitute the raw sensor for the accepted state. Automatic window detection has no physical input dependency. Other telemetry mappings keep their explicit source contract.

These semantics were checked against the installed version's [Presence documentation](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/documentation/en/feature-presence.md), [Motion documentation](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/documentation/en/feature-motion.md) and real Lab feature checks. TI's observation labels also accept `away` and booleans; that does not extend VT's own accepted input states.

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
background: blue
show_activity: true
show_details: true
step: 0.25
preset_labels:
  none: No preset
  eco: Eco
  comfort: Comfort
  frost: Frost
humidity_bands:
  dry_below: 30
  good_min: 40
  good_max: 60
  wet_above: 70
trend_entity: ""
humidity_entity: sensor.fixture_humidity
valve_position_entity: sensor.fixture_valve
features:
  - entity: climate.fixture_thermostat
    attribute: hvac_action
    label: Provider activity value
    icon: mdi:radiator
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
```

The fixture advertises its own temperature step, so the example's `step: 0.25` remains a fallback. Its preset list is synthetic and does not imply that every real standard thermostat supports Frost. The maximum age deliberately makes the humidity observation stale if it is not refreshed within five minutes, including when selected through `humidity_entity`. Trend is explicitly disabled in this example; select a suitable synthetic trend sensor in the editor to exercise that surface.

For an empty setup state, the minimal configuration is:

```yaml
type: custom:thermal-intelligence-card
entity: ""
```

For an explicit provider configuration, set `adapter: standard` or `adapter: vtherm` in a valid configuration. Changing that option configures presentation and validation only; it does not initialize, switch or reconfigure the underlying integration.

## Display preferences and operating limits

The original humidity guides use four strictly increasing integer boundaries: `dry_below: 30`, `good_min: 40`, `good_max: 60`, `wet_above: 70`. Omitting `humidity_bands` uses those defaults. Values below `dry_below` are **Too dry** (blue); from that boundary to below `good_min` are **Low humidity · warning** (amber); from `good_min` through `good_max`, inclusive, are **Good range** (green); above `good_max` through `wet_above`, inclusive, are **High humidity · warning** (amber); higher values are **Too wet** (red). Thus `30%` is low, `40%` and `60%` are good, and `70%` is high. Unavailable, invalid or stale readings have no valid classification and remain gray.

An existing `humidity_bands: {low: 35, high: 65}` retains the explicit legacy three-band format: below, within both inclusive bounds, or above. The editor identifies that format and offers an intentional reset to the original four boundaries. The formats cannot be mixed, and no automatic conversion invents the two missing boundaries. Unknown nested fields survive edits and reset. Canonical boundaries require integers; legacy bounds retain their finite numeric contract `0 ≤ low < high ≤ 100`.

All humidity colours are **Local display band** preferences. They are not HI seasonal targets, Stability, lanes, controller reasons or safety thresholds. This preview has no automatic HI contract or HI service path.

Activity is kept separate from mode, preset and ownership. Standard `hvac_action` is integration-reported activity; VT `heating` is presented as **Heat requested**, with physical heat delivery unverified. Ownership remains unknown without an authoritative ownership contract.

When details are enabled, applicable VT regulation observations include the provider's climate regulation mode/internal target or proportional function/demand and requested valve opening. These are read-only, type-gated observations with their own sources and availability states. The internal target retains its provider-declared unit, and requested valve opening is distinct from a measured valve-position source. See the [VT detail contract](provider-contracts.md#activity-and-vt-details) for exact paths and limitations; there is no regulation-setting control in this preview.

Only deliberate runtime controls may request a supported service. Setup, visual editing, preview, configuration saves, rendering and reconnection do not request heating writes. Requests retain their captured target; acknowledgement, matching state and physical behavior are distinct. Uncertain outcomes are displayed and are not automatically replayed. See the [command lifecycle](command-contract.md) for exact behavior.

Mouse and keyboard temperature drafts share context checks. A concurrent target, unit, mode, provider, readiness, configuration or session change cancels the draft instead of sending an edit derived from outdated context.

The synthetic preview alone cannot establish authenticated HA behavior. Separate Lab evidence covers narrow onboarding, registry, controller and resource-loading checks. HACS distribution, complete cache/update/rollback recovery, physical phone/tablet interaction and heating-device response remain outstanding before support or release claims change.
