<p align="center"><img src="assets/presentation/thermal-intelligence-header.png" alt="Thermal Intelligence — thermostat control for Home Assistant. By Senyo." width="100%"></p>

# Thermal Intelligence

**A clear view of temperature, control and what your thermostat is actually reporting.**

Created and maintained by **[Senyo · senyo888](https://github.com/senyo888)**.

**Beta 0.1.0-beta.2** · Home Assistant dashboard card · GPL-3.0-only software

[Beta installation](docs/beta.md) · [Configuration](https://github.com/senyo888/thermal-intelligence/blob/senyo888-patch-1/docs/card-configuration.md) · [Compatibility](https://github.com/senyo888/thermal-intelligence/blob/senyo888-patch-1/docs/compatibility.md) · [Report an issue](https://github.com/senyo888/thermal-intelligence/issues/new/choose)

Thermal Intelligence brings current and target temperatures, supported thermostat controls and device observations into one considered interface. The glass dial, restrained lighting, responsive controls and focused detail panels are the actual customer component.

<p align="center">
  <img src="assets/presentation/thermostat.png" alt="Thermal Intelligence thermostat showing 20°C and a 21°C target" width="260">
  &nbsp;
  <img src="assets/presentation/thermostat-expanded.png" alt="The same thermostat with its controls expanded" width="260">
</p>

*Actual beta UI, rendered with synthetic data. These images contain no private home configuration.*

## What the beta provides

- **Temperature control:** current and target readings, a draggable dial and controls that respect the thermostat's reported limits and capabilities.
- **Modes and presets:** supported modes, presets and provider-exposed Frost, with additional controls shown where available.
- **Useful detail:** configurable top-row icons and focused popups for humidity, temperature trend, valve opening and provider features.
- **Versatile Thermostat awareness:** readiness, a compact lock indicator with administrator [Lock/Unlock controls](docs/lock-control.md), and configured feature states, including Window Open/Closed, Presence Home/Away and Motion Detected/Clear.
- **Visual setup:** find the card in Add Card, choose your thermostat and configure each card independently.

Home Assistant and the selected thermostat remain in charge. Missing readings are shown honestly; an open valve is not presented as proof of delivered heat. **VT** means **Versatile Thermostat**. **TRV** means **thermostatic radiator valve**.

<details>
<summary>See the preset detail panel</summary>

<img src="assets/presentation/preset-details.png" alt="Preset detail panel with reported Eco, Comfort and Boost temperatures" width="390">

</details>

<details>
<summary>See administrator lock controls</summary>

<img src="assets/presentation/lock-controls.png" alt="Administrator lock dialog showing a locked synthetic thermostat, its lock scope and an explicit Unlock thermostat action" width="390">

*The code field appears only when VT reports a configured code. [Lock behavior and code-handling limits](docs/lock-control.md).*

</details>

## Try the beta

The installable beta and its source are on **[senyo888-patch-1](https://github.com/senyo888/thermal-intelligence/tree/senyo888-patch-1)**. Start with the [verified package and installation guide](docs/beta.md).

The beta has separate card and editor names so it can coexist with an existing Thermal Intelligence installation. Keep existing cards and resources in place, and add **Thermal Intelligence Thermostat · Beta** for testing.

Testing covers HA **2026.10.0**, VT **10.5.1**, inert controller fixtures, installation, removal/reinstallation, update/rollback and deliberate no-code lock commands with automatic relocking. Code/error paths have synthetic coverage only. Physical thermostats, production deployment, a minimum supported version range and HACS installation remain unverified. This is a beta for controlled testing; there is no stable release yet.

## Project direction

The standalone thermostat is the first component. House Climate, Effective Mode, Heating Control Centre, a portable backend and broader mobile/tablet dashboards are planned. They are not included in this beta.

| Branch | Purpose |
| --- | --- |
| `main` | Public project presentation; future stable releases |
| `develop` | Integration branch; currently retains the foundation |
| `senyo888-patch-1` | Working source and initial installable beta |

## Support and contribution

Use the [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose) with your TI, HA and provider versions, reproduction steps and a redacted configuration. Report vulnerabilities through the [private security route](https://github.com/senyo888/thermal-intelligence/security/advisories/new).

Read [Contributing](CONTRIBUTING.md), [Security](SECURITY.md) and the [changelog](CHANGELOG.md). Software is licensed under [GPL-3.0-only](LICENSE); artwork and documentation have separate [scope notes](docs/licensing-options.md).
