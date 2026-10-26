# Provider and observation contracts

This preview targets the public Home Assistant 2026.10 climate contract and Versatile Thermostat (VT) 10.5.1 attribute contract. These contracts were checked against upstream source and scoped test fixtures. They do not establish physical heating response, broad compatibility certification or release readiness. Unit tests use synthetic entities.

## Identity and control eligibility

The card obtains one matching registry entry with the read-only WebSocket request `config/entity_registry/get`. The provider model receives its `entity_id` and `platform`. `versatile_thermostat` identifies VT; other registered platforms use the standard climate adapter. Names, friendly names and the presence of VT-like attributes never identify a provider.

`adapter: auto` remains read-only while registry identity is missing. Explicit `standard` or `vtherm` configuration can select an adapter for an unregistered entity. A mismatched registry entity, or an explicit VT adapter conflicting with a known non-VT platform, disables controls. A known VT registry entry always retains VT restrictions, including when the card configuration requests `standard`.

An available state and a connected Home Assistant session are required for every control. VT additionally requires a literal boolean `is_ready: true`. False, missing, numeric and string values do not satisfy readiness. VT defines readiness as completed startup and initialized underlying devices. A reported lock disables user commands unless `lock_manager.lock_users` explicitly says false; a configured lock with unknown state also disables commands. The beta.2 administrator lock dialog uses a separate, narrowly guarded VT command; it does not weaken normal climate-command readiness. See [lock control](lock-control.md).

The small lock/unlock icon beside the card name reports VT's `specific_states.is_locked` boolean. It has an accessible label and tooltip. It remains read-only for ordinary users or incomplete capabilities; verified administrators can open a compact dialog and deliberately request a native VT lock/unlock action. Opening the dialog sends no service call. Lock-only explanatory text stays in the overview and accessible status, keeping the collapsed card compact. A configured lock with missing or malformed state displays a question-mark lock; disconnected or unavailable observations cannot display an unlocked state. No icon is added to standard thermostats or an unconfigured VT lock. Lock state and lock scope remain separate: an automation-only lock may be shown while user controls remain enabled.

Each ordinary climate control requires its corresponding entry in `hass.services.climate`. Temperature service availability does not establish preset, mode, fan or swing availability. A failure in optional telemetry does not disable otherwise valid climate commands.

VT 10.5.1 declares `specific_states.hvac_off_reason` and `specific_states.hvac_mode_reason` as optional strings. An explicitly present null means **None reported** in provider details and does not create an amber warning by itself. Nonblank reason text is retained. Missing properties, unknown/unavailable sentinels and malformed values remain degraded; no other null observation receives this exception. Loss of the climate entity or connection takes precedence over retained reasons.

## Climate capabilities

| Surface | Required evidence | Service |
| --- | --- | --- |
| Single temperature | `TARGET_TEMPERATURE` feature, finite `temperature`, valid limits, unit and step | `climate.set_temperature` |
| Temperature range | `TARGET_TEMPERATURE_RANGE`; selected in `heat_cool` mode, or when no single-target feature exists; two valid endpoints | `climate.set_temperature` |
| HVAC mode | Nonempty `hvac_modes` list | `climate.set_hvac_mode` |
| Preset | `PRESET_MODE` and nonempty `preset_modes` | `climate.set_preset_mode` |
| Fan | `FAN_MODE` and nonempty `fan_modes` | `climate.set_fan_mode` |
| Vertical swing | `SWING_MODE` and nonempty `swing_modes` | `climate.set_swing_mode` |
| Horizontal swing | `SWING_HORIZONTAL_MODE` and nonempty `swing_horizontal_modes` | `climate.set_swing_horizontal_mode` |

Feature values follow HA's enum: target `1`, range `2`, fan `8`, preset `16`, swing `32` and horizontal swing `512`. Unsupported surfaces remain distinguishable from supported surfaces whose service or current data is unavailable. Option values pass through unchanged. Frost is offered only when advertised; labels can change display text, never the service value. Preset `none`, current mode and coincident temperatures establish neither manual ownership nor the absence of schedules. Ownership stays **Unknown** until an authoritative contract is implemented.

HA serializes climate temperature state values and limits in its configured display unit. The model uses `hass.config.unit_system.temperature`, accepting `°C` and `°F`; it does not apply a second conversion using a provider's native unit. Temperature editing is disabled for an unknown unit, invalid limits or invalid current targets. Valid mode or preset controls remain independently usable.

Input increments prefer the entity's positive `target_temp_step`, followed by the card's optional `step`. If neither exists, the UI uses a display increment of `0.5°C` or `1°F`; `stepSource` exposes that fallback. This is an input convention, not a claim that the provider reported a precision. An explicitly invalid advertised step does not fall back silently. Quantization is anchored to `min_temp` and stays on the last valid step at or below `max_temp`. Range edits preserve the other reported endpoint and reject crossing. No target payload contains `entity_id`; the command coordinator owns the target captured at user intent.

The pure model does not call services. Setup, normalization, preview, editor save/reopen, rendering and reconnection must remain read-only. Dispatch, pending state, late results and observed convergence belong to the command coordinator described in [the architecture](../ARCHITECTURE.md).

## Activity and VT details

Standard `hvac_action` is labelled as integration-reported activity. For VT, reported `heating` displays **Heat requested** with the limitation that physical heat delivery is unverified. Neither service success, target convergence, device activity nor valve opening establishes physical heat transfer.

VT details use these explicit fields from 10.5.1:

| Detail | Attribute path | Configuration flag when applicable |
| --- | --- | --- |
| Readiness | `is_ready` | — |
| Initialization | `specific_states.is_initialized` | — |
| Device activity / requested activity | `specific_states.is_device_active` / `specific_states.should_device_be_active` | — |
| Off / mode reason | `specific_states.hvac_off_reason` / `specific_states.hvac_mode_reason` | — |
| Lock / sleep | `specific_states.is_locked` / `specific_states.is_sleeping` | — |
| Window | `window_manager.window_state` | `is_window_configured` |
| Automatic window detection | `window_manager.window_auto_state` | `is_window_auto_configured` |
| Presence | `presence_manager.presence_state` | `is_presence_configured` |
| Motion | `motion_manager.motion_state` | `is_motion_configured` |
| Safety | `safety_manager.safety_state` | `is_safety_configured` |
| Power limiting | `power_manager.overpowering_state` | `is_power_configured` |

A false configuration flag yields **disabled**. A true flag with missing data yields **unavailable**. Missing or malformed configuration evidence yields **unknown**. These observations do not introduce control services, feature toggles or discovered sensor bindings. A provider `version` attribute, when present, is displayed only as reported metadata and does not certify the provider contract.

Regulation observations use the exact `configuration.type` published by VT 10.5.1. Missing type evidence remains **unknown**; a row outside that type's contract is **unsupported**. The supported read-only rows are:

| Detail | Attribute path | Applicability / unit |
| --- | --- | --- |
| Regulation mode | `vtherm_over_climate.regulation.auto_regulation_mode` | `over_climate`, with `vtherm_over_climate.is_regulated: true` |
| Regulated target | `vtherm_over_climate.regulation.regulated_target_temperature` | Same gate; internal temperature uses the explicit `configuration.temperature_unit` (`°C` or `°F`) |
| Proportional function | `configuration.proportional_function` | `over_switch`, `over_valve` or `over_climate_valve` |
| Regulation demand | `on_percent` | Same proportional types; provider fraction from 0 to 1 displayed as a percentage |
| Requested valve opening | `valve_open_percent` | `over_valve` or `over_climate_valve`; percentage from 0 to 100 |

An explicitly disabled climate regulation flag yields **disabled** for its mode/target rows; missing expected values are **unavailable**, unknown values stay **unknown**, and malformed numbers are **invalid**. The internal regulated target is separate from HA's serialized climate setpoint: it retains the provider-declared unit, without substituting HA's display unit or inventing a conversion. Regulation demand includes VT's reported safety and maximum-output adjustments. It is not measured power. Requested valve opening is not independently observed position or proof of heat delivery. No regulation mode, coefficient, valve command or underlying entity is changed or discovered by these details.

## Optional telemetry

Telemetry is an explicit per-card list. Its supported configuration is `{kind, entity, attribute?, label?, unit?, max_age_seconds?}`. Kinds are `humidity`, `trend`, `valve`, `energy`, `power` and `custom`. An empty entity represents a disabled row. There is no automatic entity search, private default, or inference from similarly named entities.

`attribute` is a dot-separated own-property path. Prototype properties and the keys `__proto__`, `constructor` and `prototype` are rejected. With no attribute, the source is the entity state and its declared `unit_of_measurement`. An attribute requires its own explicit unit for typed numeric telemetry: the parent entity's unit does not necessarily describe a nested value. A configured unit conflicting with a state sensor's unit is invalid; the card does not reinterpret or convert it.

| Kind | Accepted units / value |
| --- | --- |
| Humidity or valve percentage | `%`, finite value from 0 to 100 |
| Temperature trend | `°C/h`, `°F/h`, `°C/hour`, `°C/hr`, `degC/h`, `°F/hour`, `°F/hr`, `°C/min`, `°F/min`; finite signed value |
| Power | `W`, `kW`, `MW`; finite value |
| Energy | `Wh`, `kWh`, `MWh`, `J`, `kJ`, `MJ`, `GJ`; finite value |
| Custom | Finite numeric value, reported text or boolean; optional declared unit |

Every row carries status, source, value, unit and an explanatory detail. Missing entities or expected attributes are **unavailable**; provider `unknown` values stay **unknown**; invalid numbers and incompatible units are **invalid**. No arbitrary age threshold applies. Only an explicit `max_age_seconds` compares the entity's `last_updated` against the observation time. Old values become **stale**; missing or future timestamps leave freshness **unknown**. `last_updated` describes the HA entity update, not an independently verified physical sample time. A disconnected session makes configured telemetry unavailable for refresh.

Humidity presentation preserves the original five bands with default `{dry_below: 30, good_min: 40, good_max: 60, wet_above: 70}`. Canonical boundaries are strictly increasing integers within 0–100. Values below `dry_below` are dry; below `good_min` are low; through `good_max` inclusive are good; through `wet_above` inclusive are high; higher values are wet. Existing explicit `{low, high}` remains a distinct legacy three-band format with inclusive within bounds and finite numeric `0 ≤ low < high ≤ 100`. Mixed formats are rejected. Classification applies only to valid available humidity, never stale evidence. It is labelled **Local display band** and does not represent HI seasonal targets, Stability, lanes or decisions. There is no implicit HI contract or HI command path in this preview.

## Configuration and model interfaces

`normalizeConfig(raw)` accepts an empty climate entity for setup and otherwise requires a `climate.*` entity ID. Schema version is `1`; unsupported versions are rejected. Defaults are `adapter: auto`, `background: blue`, `show_activity: true`, `show_details: true`, empty preset label overrides, empty features and empty telemetry. Background accepts `blue`, `plum` or `black`, preserving the existing TI palettes. A previously supplied valid `theme` is retained as inert legacy data. Name and labels are plain text. `step` and `max_age_seconds` must be finite positive numbers. Omitted humidity guides use the original source defaults; the legacy format remains explicit.

Optional `trend_entity`, `humidity_entity` and `valve_position_entity` map explicit sensor states to the original card surfaces. Known compatible units and finite values are required; humidity and valve percentages must be within 0–100. The `features` array retains portable `{entity, label?, attribute?, unit?, icon?, preset?}` observations using own-property paths. Optional `preset` is an exact provider value; associated readings require one finite numeric source with a known `°C`/`°F` unit matching the climate display unit. Duplicate associations, missing units and unit conflicts are not resolved by inference. Unadvertised preset associations are unsupported. Header activation additionally requires connected, available, ready Heat mode and that exact selected advertised preset, excluding `none`. No name-based preset inference, target-coincidence activation or ownership is imported. A direct mapping overrides a different typed telemetry source; an explicitly configured matching state source retains its typed metadata and freshness checks.

Unknown top-level keys, feature-row keys, telemetry-row keys and humidity-band keys survive normalization. Normalization does not mutate the input. Editor patches must retain these unknown keys instead of rebuilding a minimal config. Recognized invalid values produce a useful error rather than being replaced with control defaults.

`buildModel(hass, config, identity, {now})` returns provider evidence, connection/availability/readiness, temperature capabilities, independent choices, activity, unknown ownership, VT detail rows and optional telemetry. It also exposes read-only `attrs`, `state` and `action`, plus attributed `headerTelemetry`, `humidity`, `trend`, `output` and `arc` objects for the original visual surfaces. `presetReadings` is keyed by exact preset and contains `{preset, label, status, value, unit, source, selected, reason}`. Reading availability and selection remain distinct. Humidity rows expose `guides`, `guideMode` (`canonical` or `legacy`), `band`, `bandStatus: {key, label, colour}` and source colour; the header includes the matching activity label. Output distinguishes reported TRV position from thermostat demand. `arc` contains `{color, reason, label, explanation, responding, delta, expiresAt}`. It distinguishes the canonical corroborated response from the unmapped target-comparison fallback; it never claims ownership or proven physical heat delivery. `now` defaults to `Date.now()` and is injectable for deterministic freshness tests. The model has no timers, network access or service writes. `quantize(value, min, max, step)` and `targetPayload(model, key, proposedValue)` expose the same temperature rules to the command coordinator.

### Temperature-response evidence

The unmapped fallback requires connection, availability/readiness, a finite current temperature, known display unit, recognized mode and one finite target within valid reported limits. Ranges or insufficient evidence stay gray. It uses the selected climate's serialized target: Off `#7c8ba2`, reported cooling `#66cfff`, below target `#50c8ff`, target through `0.2` display degrees above `#62e3b0`, and further above `#c4a7ff`. It cannot produce orange.

Optional `response_arc` mappings activate the VT response contract. They contain `room_sensor`, `native_thermostat`, `confirmed_output`, optional `heat_source`, and optional `freshness_minutes`. All entity mappings are explicit. `configuration.temperature_unit` must be a known `°C`/`°F` value equal to the display unit before reading VT's internal effective target or slope. A present invalid effective target never falls back to the public target. Native acceptance reads `vtherm_over_climate.regulation.regulated_target_temperature` when that property exists; only an absent property permits the legacy `regulated_target_temperature` field. This supports the current VT schema without substituting older evidence for invalid current evidence.

Orange (`#ff9459`, `responding: true`) requires every applicable observation below:

- Ready VT, effective Heat, below its valid effective target, and current `hvac_action: heating`.
- Boolean safety/window/power configuration flags. Configured restrictions must report inactive; a reported window bypass can permit the window path. Unknown flags or active/unknown restrictions fail closed.
- Any mapped heat source must be available in Heat. A native path requires the mapped thermostat in Heat with a target matching the current VT regulated target within half its positive target step, or `0.05` if no valid step is reported.
- A TRV path requires a live valve observation above zero and at most 100%, plus an explicitly mapped confirmed-output climate listed in VT's `vtherm_over_climate.underlying_entities`. That output must be live in Heat with `command_confirmed: true`, `native_write_unconfirmed: false`, `control_fault: null`, `warm_cutoff_inhibited: false`, `manual_reconciliation_pending: false` and `physical_override_unadopted: false`. Optional `automatic_recovery` must be inactive and either idle, or recovered with `verified: true`.
- The actual mapped room reading must match VT current temperature within `0.05` degrees plus numeric tolerance. The mapped hourly-normalised trend must match `specific_states.temperature_slope` within `0.01`; room, trend and VT units must agree. Both readings must be available.
- Room `last_changed` and trend `last_updated` must be valid, not future, and within the configured window: default 10 minutes, greater than zero and no more than 30, capped by a positive VT safety delay. Matching typed telemetry age limits remain binding. A newer VT attribute timestamp cannot substitute for a new room value.
- Trend must be greater than `0.05°C/hour` (or `0.09°F/hour`) and no greater than `2.5°C/hour` (or `4.5°F/hour`). Flat, falling or unusually rapid change remains blue.

The canonical ordering is preserved: effective Off, native reported cooling, valid room source, above/at-target bands, then below-target response evidence. TRV valve telemetry has no cooling action. Optional unmapped output is not discovered from a similar entity name. Unknown declared units are handled more strictly than the private source, and current VT nested regulated-target support is explicit.

`expiresAt` is the earliest inclusive evidence deadline. The renderer schedules a refresh just after it, even with no HA events. During a held target draft only the arc, accent and explanation refresh; the input retains its capture and no command is sent. A disconnected or changed configuration cannot retain response certainty. The fine slope ring, activity chip and health LED keep their own meanings.

Orange describes an accepted request and a contemporaneous warming observation. It does not establish causation, boiler firing, radiator flow or a hardware acknowledgement beyond the provider's reported contract.

## Source references and validation limits

The source checks use pinned upstream versions:

- [HA 2026.10.0 climate entity implementation](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/climate/__init__.py) and [feature enum](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/climate/const.py).
- [HA entity-registry WebSocket handlers](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/components/config/entity_registry.py) and [registry serialization](https://github.com/home-assistant/core/blob/2026.10.0/homeassistant/helpers/entity_registry.py).
- [VT 10.5.1 base thermostat](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/base_thermostat.py) and [manifest](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/manifest.json).
- VT regulation implementations: [climate](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/thermostat_climate.py), [proportional base](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/thermostat_prop.py), [switch](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/thermostat_switch.py), [valve](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/thermostat_valve.py) and [climate with valve regulation](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/thermostat_climate_valve.py).
- VT feature managers: [window](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/feature_window_manager.py), [presence](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/feature_presence_manager.py), [motion](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/feature_motion_manager.py), [safety](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/feature_safety_manager.py), [power](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/feature_power_manager.py) and [lock](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/feature_lock_manager.py).

Run the model suite with `node --test tests/unit/model.test.mjs` after installing the repository's declared Node environment. The synthetic suite checks configuration preservation, identity conflicts, VT readiness/locks, advertised capabilities and services, Celsius/Fahrenheit targets, ranges, non-finite values, quantization, activity wording, own-property observations, units and explicit freshness. Browser integration, authenticated Lab behavior, provider-version upgrades and physical devices require separate evidence; these unit tests do not establish them.
