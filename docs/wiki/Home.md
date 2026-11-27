# Thermal Intelligence Wiki

<img src="https://raw.githubusercontent.com/senyo888/thermal-intelligence/0d2075b490a1487f79797105645fd8df08649c59/assets/presentation/thermal-intelligence-v1.0.1-release-header.png" alt="Thermal Intelligence v1.0.1. A thermostat dashboard card+. Now in the Home Assistant Marketplace." width="100%">

[![Latest published release](https://img.shields.io/github/v/release/senyo888/thermal-intelligence?label=Release&color=725691)](https://github.com/senyo888/thermal-intelligence/releases/latest) [![Latest published package manifest version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2Fsenyo888%2Fthermal-intelligence%2Freleases%2Flatest%2Fdownload%2Fmanifest.json&query=%24.version&label=Manifest&color=536b87)](https://github.com/senyo888/thermal-intelligence/releases/latest/download/manifest.json)

## Start here

Search for **Thermal Intelligence** by **senyo888** in the Dashboard catalogue. Install the [latest stable version](https://github.com/senyo888/thermal-intelligence/releases/latest), then choose **Thermal Intelligence Thermostat** in the card picker. Start with the [Marketplace installation guide](https://github.com/senyo888/thermal-intelligence/blob/main/docs/marketplace.md) or, on older Home Assistant systems, the [HACS guide](https://github.com/senyo888/thermal-intelligence/blob/main/docs/hacs.md).

**Already running RC.3?** Its picker reads **Thermal Intelligence Thermostat · RC**. The [RC.3 setup guide](https://github.com/senyo888/thermal-intelligence/blob/4caf6f84868079a4d8f25c5d5731654f015bc260/docs/card-configuration.md#visual-configuration) matches that editor.

## Set up your first room

Start with one thermostat and follow the [first-room walkthrough](https://github.com/senyo888/thermal-intelligence/wiki/Configuration).

1. **Set up your room.** Select a climate entity and save. Expose [VT readings or your own sensors](https://github.com/senyo888/thermal-intelligence/wiki/Configuration#choose-your-sources), then [arrange the header](https://github.com/senyo888/thermal-intelligence/wiki/Configuration#arrange-the-top-row).
2. **Read the result.** Learn what the [arc, slope ring, status chip and LED](https://github.com/senyo888/thermal-intelligence/wiki/Reading-the-card) tell you. To enable the optional warming response, follow the [temperature response walkthrough](https://github.com/senyo888/thermal-intelligence/wiki/Configuration#set-up-temperature-response).

[See the Plum card, top-row layout and VT response setup in Senyo’s introduction to 1.0.0](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.0) · [Complete settings and YAML](https://github.com/senyo888/thermal-intelligence/blob/main/docs/card-configuration.md)

## Find your way

- [Thermal Intelligence in your home](https://github.com/senyo888/thermal-intelligence/wiki/Architecture-and-ownership) explains the sources, observations and control boundaries.
- [VT lock control](https://github.com/senyo888/thermal-intelligence/wiki/VT-lock-control) covers administrator actions and provider behaviour.
- [Marketplace](https://github.com/senyo888/thermal-intelligence/blob/main/docs/marketplace.md) covers Home Assistant 2026.11 and later; [HACS](https://github.com/senyo888/thermal-intelligence/blob/main/docs/hacs.md) covers older installations.
- [Troubleshooting](https://github.com/senyo888/thermal-intelligence/wiki/Troubleshooting) helps with resource loading, observations and rollback.

[Compatibility by version](https://github.com/senyo888/thermal-intelligence/wiki/Compatibility) covers stable releases and earlier prereleases.

[Website](https://senyo888.github.io/thermal-intelligence/) · [Repository](https://github.com/senyo888/thermal-intelligence) · [Changelog](https://github.com/senyo888/thermal-intelligence/blob/main/CHANGELOG.md)
