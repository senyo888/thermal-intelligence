# Troubleshooting and support

## The card is missing from Add Card

Check that the verified beta module is registered once as a **JavaScript module** resource. Open a fresh browser document after changing its URL. The picker entry is **Thermal Intelligence Thermostat · Beta**. Keep legacy TI resources separate.

## The LED is amber

Tap the LED to see which observation or restriction needs attention. Beta.4 accepts an explicitly null VT Off reason or Mode reason as **None reported**. Missing fields, unknown/unavailable observations, malformed values and real lock/readiness restrictions remain visible. An amber detail warning does not itself change command permissions.

## Controls are unavailable

Check the selected entity, connection, provider readiness, advertised capabilities and VT lock scope. Missing readiness cannot enable fallback controls. Lock actions also require a verified administrator and complete provider capabilities; see [VT lock control](VT-lock-control).

## The arc, ring and status differ

They describe different observations: temperature response, temperature slope and thermostat/valve activity. A room can keep warming after its valve closes. A falling room temperature does not establish active HVAC cooling. See [Reading the card](Reading-the-card).

## Update or rollback

Use the exact module and resource procedure in [Installing the beta](Installing-the-beta). Retain the previous file and configuration. A frontend rollback cannot undo a provider command.

## Report a problem

Use the [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose) with your TI, HA, provider and browser/Companion versions, installation method, reproduction steps and a minimal redacted configuration. Include screenshots only after removing private names and entities.

Report vulnerabilities privately through [GitHub security reporting](https://github.com/senyo888/thermal-intelligence/security/advisories/new).
