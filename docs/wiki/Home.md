# Thermal Intelligence manual

**A clear view of temperature, control and what your thermostat is actually reporting.** Created and maintained by [Senyo · senyo888](https://github.com/senyo888).

Current version: **0.1.0-beta.4**. The standalone thermostat works with a standard climate entity or Versatile Thermostat (VT), with optional humidity, trend, valve and provider details. No TI backend is required.

<img src="https://raw.githubusercontent.com/senyo888/thermal-intelligence/main/assets/presentation/thermal-intelligence-header.png" alt="Thermal Intelligence — by Senyo" width="1000">

## Start here

1. [Install the beta](Installing-the-beta), keeping any existing TI cards and resources in place.
2. [Configure your card](Configuration) with Home Assistant’s visual editor.
3. [Read the card](Reading-the-card): arc, slope ring, status chip, LED and top-row icons.
4. [Explore the state gallery](State-gallery) and [check compatibility](Compatibility).

Beta.4 fixes a false amber LED when VT explicitly reports no optional Off or Mode reason. Genuine unknown, unavailable and malformed observations remain visible. Command permissions and saved configuration are unchanged.

HACS installation, physical heating, native phone/tablet use and a minimum supported version range remain unverified. This is an untagged beta, not a stable release.

[Website](https://senyo888.github.io/thermal-intelligence/) · [Repository](https://github.com/senyo888/thermal-intelligence) · [Changelog](https://github.com/senyo888/thermal-intelligence/blob/main/CHANGELOG.md) · [Support](Troubleshooting)
