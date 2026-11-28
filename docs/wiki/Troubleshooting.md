# Troubleshooting and support

## The card is missing from Add Card

Check the installed version. In v1.0.1 the picker reads **Thermal Intelligence Thermostat**. A **· RC** or **· Beta** suffix identifies a prerelease channel. Check the exact version in the package manifest to find its matching guide. New v1.0.1 cards use `custom:thermal-intelligence-thermostat`. Existing cards using `custom:thermal-intelligence-beta-card` still work. Keep one registration for the standalone module, then open a fresh browser document. The older dashboard card uses a separate registration. [Upgrade and rollback](https://github.com/senyo888/thermal-intelligence/blob/main/docs/migration.md).

## My icon layout disappeared

The settings opened from the card are a draft. Copy the complete configuration into that card’s dashboard code editor and choose **Save**, or make the change in **Edit dashboard → Edit → Readings and icons → Top row icon settings**. Reopen the card to verify it. [Step-by-step guide](https://github.com/senyo888/thermal-intelligence/wiki/Configuration#arrange-the-top-row).

## My reading is missing

Check the entity’s current value and unit in Home Assistant. A humidity reading needs a number in percent. A trend needs degrees per unit of time. For a VT suggestion, check that the feature is configured and its entity enabled. Open the reading preview for its source and status. [Source setup](https://github.com/senyo888/thermal-intelligence/wiki/Configuration#choose-your-sources).

## The LED is amber

Tap the LED to see which observation or restriction needs attention. The card displays an explicitly null VT Off reason or Mode reason as **None reported**. Missing fields, unknown/unavailable observations, malformed values and real lock/readiness restrictions remain visible. An amber detail warning does not itself change command permissions.

## Controls are unavailable

Check the selected entity, connection, provider readiness, advertised capabilities and VT lock scope. Missing readiness cannot enable fallback controls. Lock actions also require a verified administrator and complete provider capabilities; see [VT lock control](https://github.com/senyo888/thermal-intelligence/wiki/VT-lock-control).

## The arc, ring and status differ

They describe different observations: temperature response, temperature slope and thermostat/valve activity. A room can keep warming after its valve closes. A falling room temperature does not establish active HVAC cooling. See [Reading the card](https://github.com/senyo888/thermal-intelligence/wiki/Reading-the-card).

## Update or rollback

For v1.0.1, compare the served module with the [published checksum](https://github.com/senyo888/thermal-intelligence/blob/main/docs/compatibility.md#101-package) and confirm only one standalone resource is registered. Follow the [migration guide](https://github.com/senyo888/thermal-intelligence/blob/main/docs/migration.md) for the installer that owns your resource. Keep your previous module and its saved configuration together. A frontend rollback cannot undo a provider command.

## Report a problem

Use the [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose) with your TI, HA, provider and browser/Companion versions, installation method, reproduction steps and a minimal redacted configuration. Include screenshots only after removing private names and entities.

Report vulnerabilities privately through [GitHub security reporting](https://github.com/senyo888/thermal-intelligence/security/advisories/new).
