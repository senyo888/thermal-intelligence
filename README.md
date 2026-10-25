# Thermal Intelligence

**Thermostat control for Home Assistant, with temperature, presets and device state in one clear view.**

Created and maintained by **[Senyo (senyo888)](https://github.com/senyo888)**.

Status: **local development preview, 25 October 2026**. The standalone card, visual editor and synthetic test harness are implemented on this development branch. **There is no supported release or HACS package yet.** A dedicated HA Lab now exercises five controller paths and four failure cases. Physical devices and a supported version range remain unverified. TI code uses **GPL-3.0-only**; see [licence scope](docs/licensing-options.md). A cinematic Thermal home logo study is prepared; final artwork and its reuse terms remain undecided.

The preview provides target/current temperatures, advertised modes and presets including provider-exposed Frost, range/fan/swing capabilities, optional telemetry and VT readiness checks. It registers an **Add Card entry and a visual editor**. The thermostat card does not require a TI backend. Home Assistant Generic Thermostat and specifically tested Versatile Thermostat versions are the intended initial release targets.

**VT** means **Versatile Thermostat**; **TRV** means **thermostatic radiator valve**. Valve opening is shown separately from a request for heat.

The product roadmap also includes House Climate, Effective Mode, Heating Control Centre, an optional portable backend and full mobile/tablet dashboards. These are planned components, not installed features.

The customer component preserves the established TI glass/dome design.

## Try the local fixture

With Node 22 or newer:

```sh
npm ci
npm run build
npm run preview
```

Open the loopback address printed by the server. This is a synthetic browser fixture with a service recorder and **no HA connection or physical outputs**. See [card configuration](docs/card-configuration.md), [provider contracts](docs/provider-contracts.md) and [command safety](docs/command-contract.md). For validation, run `npm test`, `npx playwright install chromium`, then `npm run test:browser`.

## Project documents

- [Architecture](ARCHITECTURE.md) — provider, capability, command and UI truth contracts.
- [provenance](docs/source-provenance.md).
- [Compatibility and validation](docs/compatibility.md) and [migration](docs/migration.md).
- [Licence options](docs/licensing-options.md) and [distribution](docs/distribution.md).
- [Contributing](CONTRIBUTING.md), [security](SECURITY.md) and [changelog](CHANGELOG.md).

Installation instructions and release badges will be added only when a qualifying artifact exists. Branding and screenshots are required launch work; no placeholder artwork is presented as a finished logo or working UI.

Use [issue forms](https://github.com/senyo888/thermal-intelligence/issues/new/choose) for documentation bugs, configuration questions, ideas and gallery proposals. Report vulnerabilities through the [private security route](https://github.com/senyo888/thermal-intelligence/security/advisories/new). Pull requests target `develop`.
