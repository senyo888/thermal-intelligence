<p align="center"><img src="assets/presentation/thermal-intelligence-header.png" alt="Thermal Intelligence — thermostat control for Home Assistant. By Senyo." width="100%"></p>

# Thermal Intelligence

**A clear view of temperature, control and what your thermostat is actually reporting.**

Created and maintained by **[Senyo · senyo888](https://github.com/senyo888)**.

[![Beta 0.1.0-beta.4](https://img.shields.io/badge/beta-0.1.0--beta.4-d9a36c)](docs/beta.md)
[![Beta checks](https://github.com/senyo888/thermal-intelligence/actions/workflows/foundation.yml/badge.svg?branch=senyo888-patch-1)](https://github.com/senyo888/thermal-intelligence/actions/workflows/foundation.yml?query=branch%3Asenyo888-patch-1)
[![Project Site](https://img.shields.io/badge/Project%20Site-GitHub%20Pages-5aa8d6)](https://senyo888.github.io/thermal-intelligence/)
[![Software GPL-3.0-only](https://img.shields.io/badge/software-GPL--3.0--only-5e9bc5)](LICENSE)

[Website](https://senyo888.github.io/thermal-intelligence/) · [Wiki](https://github.com/senyo888/thermal-intelligence/wiki) · [Beta installation](docs/beta.md) · [Configuration](https://github.com/senyo888/thermal-intelligence/blob/senyo888-patch-1/docs/card-configuration.md) · [Compatibility](https://github.com/senyo888/thermal-intelligence/blob/senyo888-patch-1/docs/compatibility.md) · [Report an issue](https://github.com/senyo888/thermal-intelligence/issues/new/choose)

Thermal Intelligence brings current and target temperatures, supported thermostat controls and device observations into one considered interface. The glass dial, restrained lighting, responsive controls and focused detail panels keep everyday readings clear and further detail close at hand.

<table>
  <tr><th>Heat requested · rising</th><th>Idle · near target</th></tr>
  <tr>
    <td valign="top" align="center"><img src="assets/presentation/heating-request-example.png" alt="Collapsed TI card showing Heat requested, 20.1°C, a rising trend and orange arc" width="260"></td>
    <td valign="top" align="center"><img src="assets/presentation/thermostat-idle-example.png" alt="Collapsed TI card showing Idle, 20.7°C, a near-flat trend and green arc" width="260"></td>
  </tr>
  <tr><th>TRV closed · falling</th><th>Above target · rising</th></tr>
  <tr>
    <td valign="top" align="center"><img src="assets/presentation/trv-closed-falling-example.png" alt="Collapsed TI card showing 20.6°C, TRV Closed at 0%, a falling trend and blue arc" width="260"></td>
    <td valign="top" align="center"><img src="assets/presentation/trv-above-target-rising-example.png" alt="Collapsed TI card showing 20.1°C above a 19.5°C target, a lavender arc and orange rising-trend ring" width="260"></td>
  </tr>
</table>

*Four anonymised installation examples. Their source builds were not recorded; some header indicators belong to backend features outside the standalone beta. They show UI diversity, not a beta feature checklist. [Image notes](docs/image-notes.md).*

## More information, without a crowded card

The everyday view stays simple: the room temperature, your target, a clear status and controls within reach. Behind that simplicity, the dial, colour, icons and small indicators each have a purpose. Tap for context, expand for controls, then return to the quiet overview.

### Read the room at a glance

| Detail | What it tells you |
| --- | --- |
| **Glass dial and outer arc** | The large reading is the current temperature; the pearl marker locates your target on the scale. The arc changes with the room's reported state and temperature response: orange for corroborated warming below target, cyan for reported cooling, green in the target band and lavender above it. Blue below target means warming is not yet established; Off and unavailable states are muted. Drag the marker or use minus/plus within the thermostat's reported limits. |
| **Temperature-slope ring** | The fine ring around the sphere shows the direction of temperature change from your configured trend source. Warm orange/red tones indicate rising readings, blues indicate falling readings, and green or pale tones indicate a near-flat trend. The accompanying Rising, Falling or Stable label gives the rate and units, so the colour has an explanation. Missing trend data is shown as unavailable. |
| **Dynamic status chip** | The chip adapts to the available evidence: reported Heating, Cooling or Idle; **Heat requested** for VT; or **TRV Open/Closed** with a reported valve percentage when mapped. **Heat enabled** means the mode is selected when activity is not reported. Tap the chip for the overview and the source behind the status. |
| **Status LED** | The small LED summarises connection and readiness: green for the card's ready state, amber when controls or observations need attention, and red when disconnected or unavailable. Tap it to open temperatures, modes, provider details and request status. A press-and-hold opens the registered device's Home Assistant settings, with thermostat details as the fallback. |

**Beta.4 removes a false amber warning.** VT can explicitly report no Off reason or Mode reason; these now read **None reported** in the overview. Missing, unknown, unavailable or malformed observations still need attention. Readiness and command guards are unchanged.

The outer arc, slope ring and activity chip are deliberately independent: the arc combines the room's state with corroborated temperature response, the fine ring shows measured temperature slope, and the chip reports activity. Idle is a reported activity, not a universal arc colour. A rising temperature slope can continue after the valve closes; the closed TRV does not establish an orange response arc.

**Orange has a specific meaning.** With the optional VT response sources configured, the room must be below its effective target, the current heat request must be accepted, and fresh room and trend readings must agree that it is warming. An open valve or a heating request alone is insufficient. When those observations expire, the arc returns to blue and the LED overview explains why. Standard thermostats and cards without response mappings retain the temperature comparison and reported cooling colours; they do not invent accepted-output evidence. [Response setup and colour meanings](https://github.com/senyo888/thermal-intelligence/blob/senyo888-patch-1/docs/card-configuration.md#temperature-response-arc).

The staggered glint of the small lights around the dial and the slope ring's gentle breathing preserve the original glass-and-light character. They add depth without replacing readable values or status text, and respect reduced-motion preferences.

<table>
  <tr><th>TRV open · rising</th><th>TRV closed · still rising</th></tr>
  <tr>
    <td valign="top" align="center"><img src="assets/presentation/trv-open-warming-example.png" alt="Anonymised TI example showing 19.9°C, rising temperature and TRV Open at 100%" width="260"></td>
    <td valign="top" align="center"><img src="assets/presentation/trv-closed-rising-example.png" alt="Anonymised TI example showing 19.4°C, a blue outer arc, orange slope ring and TRV Closed at 0%" width="260"></td>
  </tr>
</table>

*Anonymised installation examples, with source builds unrecorded. The right-hand card shows why these indicators are independent: a closed valve and a rising room temperature can occur together. Neither image alone proves physical heat delivery.*

### A top row that earns its space

Each configured icon combines a compact reading with colour that follows its meaning. Humidity follows your display bands; window, presence and motion distinguish **Open/Closed**, **Home/Away** and **Detected/Clear**; supported presets retain their own Frost, Eco, Comfort and Boost colours. Active, inactive and unknown observations receive distinct treatments, with missing information muted.

Choose which readings appear, their order, labels and icons for each card. Humidity, temperature, valve position and provider features can sit beside the room name without filling the main dial with detail. Tap a reading for its focused panel or Home Assistant source details. The compact VT lock indicates its reported state and opens [Lock/Unlock controls](docs/lock-control.md) for verified administrators when supported.

**Humidity presentation is customisable.** Set four boundaries for too dry, the start and end of your good range, and too wet. The display uses blue, amber, green, amber and red bands, with a reading and explanation in the humidity panel. These are visual preferences for this card; they do not change heating or humidity control. Save them through Home Assistant's visual card editor; the in-card adjustment panel provides a draft to copy.

<details>
<summary>Explore window details and administrator lock controls</summary>

<table>
  <tr><th>Window details</th><th>Administrator lock controls</th></tr>
  <tr>
    <td valign="top" align="center"><img src="assets/presentation/window-detection-example.png" alt="Window detail panel showing Closed, bypass Off, Frost temperature action, delays and reported valve opening" width="280"></td>
    <td valign="top" align="center"><img src="assets/presentation/lock-controls.png" alt="Administrator lock dialog for a locked synthetic thermostat with an explicit Unlock thermostat action" width="280"></td>
  </tr>
</table>

The window panel separates detector state, configured response and reported valve opening. The lock dialog exposes the provider's scope and explicit action; a code field appears only when VT reports a configured code. [Lock behavior and limits](docs/lock-control.md).

*Left: anonymised installation example, source build unrecorded. Right: actual beta.2 component with synthetic data and no configured code.*

</details>

### Open only the controls you need

The chevron reveals **Controls & features**: the thermostat's supported HVAC modes and presets, fan or swing choices where advertised, and relevant provider and telemetry details. VT can also expose its preset-temperature comparison, Follow setting information and configured feature observations. Top-row icon settings are available here too. Tap the centre temperature to open the thermostat's native Home Assistant details.

This keeps occasional settings close without putting every control on the everyday face of the card. Home Assistant and the selected thermostat remain in charge.

<details>
<summary>Explore expanded controls and preset details</summary>

<table>
  <tr><th>Expanded controls</th><th>Preset detail</th></tr>
  <tr>
    <td valign="top" align="center"><img src="assets/presentation/thermostat-expanded.png" alt="Actual beta thermostat with Controls and features expanded" width="280"></td>
    <td valign="top" align="center"><img src="assets/presentation/preset-details.png" alt="Actual beta preset detail panel with reported Eco, Comfort and Boost temperatures" width="280"></td>
  </tr>
</table>

*Unedited beta.2 component captures using synthetic data. These show the expanded controls and detail panels; the beta.3 response-arc changes are described above.*

</details>

## One card, different setups

Start with a standard climate entity or configure **Versatile Thermostat (VT)**. Add an explicit **thermostatic radiator valve (TRV)** opening source when available, or use the thermostat's reported activity. Optional humidity, trend and other sensors build up the view independently; the card does not require a TI backend. Dedicated Lab coverage includes Generic Thermostat and VT switch, climate, valve and combined climate/valve configurations. [Compatibility and its limits](https://github.com/senyo888/thermal-intelligence/blob/senyo888-patch-1/docs/compatibility.md) remain explicit.

For a phone, keep a compact room view with the most useful readings. For a tablet or wider dashboard, place several independently configured cards together and expand the room you are working with. The layout adapts to the space available, the top row scrolls when needed, and controls retain touch-sized targets and keyboard access. Choose **Midnight Blue**, **Plum** or **Black**, and set activity and detail visibility per card. Responsive browser checks cover phone, tablet and desktop widths; physical-device validation is still pending.

Ordinary setup is visual: **Add Card → Thermal Intelligence Thermostat · Beta**, choose your thermostat, then select the readings and presentation that suit that card. [Configuration guide](https://github.com/senyo888/thermal-intelligence/blob/senyo888-patch-1/docs/card-configuration.md).

<img src="assets/presentation/multi-card-dashboard-example.png" alt="Anonymised TI dashboard with eight numbered cards, independent targets, varied header telemetry and different arc and trend colours" width="100%">

*Anonymised example of a wider TI dashboard, with source build unrecorded. The partially visible second row and clipped header text are retained from the supplied capture. This illustrates a wider layout; it is not a complete dashboard shipped with the standalone beta.*

[Explore the full state gallery](docs/ui-examples.md) for larger examples and their explanations.

<details>
<summary>More combinations: Call for heat, Heat enabled and falling temperature</summary>

<table>
  <tr><th>Call for heat</th><th>Heat enabled</th><th>Above target · falling</th></tr>
  <tr>
    <td valign="top" align="center"><img src="assets/presentation/thermostat-call-for-heat-example.png" alt="Anonymised TI example showing Call for heat, 78% valve opening and falling temperature" width="220"></td>
    <td valign="top" align="center"><img src="assets/presentation/thermostat-heat-enabled-example.png" alt="Anonymised TI example showing Heat enabled, 21.1°C and a 20.3°C target" width="220"></td>
    <td valign="top" align="center"><img src="assets/presentation/trv-above-target-falling-example.png" alt="Anonymised TI example showing 23°C above a 19.7°C target, a lavender arc, blue slope ring and Closed window" width="220"></td>
  </tr>
</table>

**Heat enabled** describes the selected HVAC mode; it does not prove active heating. A falling temperature trend does not establish active HVAC cooling. These additional installation examples have anonymised names and unrecorded source builds. [Image notes](docs/image-notes.md).

</details>

## Try the beta

The installable beta and its source are on **[senyo888-patch-1](https://github.com/senyo888/thermal-intelligence/tree/senyo888-patch-1)**. Start with the [verified package and installation guide](docs/beta.md).

The beta has separate card and editor names so it can coexist with an existing Thermal Intelligence installation. Keep existing cards and resources in place, and add **Thermal Intelligence Thermostat · Beta** for testing.

Testing covers HA **2026.10.0** and **2026.10.4** with VT **10.5.1**, including manual installation and test-environment rollback. Physical heating response, native phone/tablet use, a minimum supported version range and HACS installation remain unverified. See [Compatibility](docs/compatibility.md) for the scope of each check. This is a beta; there is no stable release yet.

## Project direction

The standalone thermostat is the first component. House Climate, Effective Mode, Heating Control Centre, a portable backend and broader mobile/tablet dashboards are planned. They are not included in this beta.

| Branch | Purpose |
| --- | --- |
| `main` | Public project presentation; future stable releases |
| `develop` | Contribution and integration branch; no package yet |
| `senyo888-patch-1` | Working source and initial installable beta |

## Support and contribution

Use the [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose) with your TI, HA and provider versions, reproduction steps and a redacted configuration. Report vulnerabilities through the [private security route](https://github.com/senyo888/thermal-intelligence/security/advisories/new).

Read [Contributing](CONTRIBUTING.md), [Security](SECURITY.md) and the [changelog](CHANGELOG.md). Software is licensed under [GPL-3.0-only](LICENSE); artwork and documentation have separate [scope notes](docs/licensing-options.md).

[![Star Thermal Intelligence](https://img.shields.io/badge/Star%20%2F%20Support-Thermal%20Intelligence-2ea44f?logo=github&logoColor=white)](https://github.com/senyo888/thermal-intelligence)
