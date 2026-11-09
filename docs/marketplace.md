# Install with Home Assistant Marketplace

Thermal Intelligence is a standalone **Dashboard** card. It uses your existing climate entities; no TI controller or backend integration is required. On Home Assistant 2026.11 and later, Marketplace is the installation route. For earlier Home Assistant versions, use the [HACS guide](hacs.md).

**RC.2 is in preparation and has no published release yet.** These instructions prepare its controlled installation; they do not claim installer acceptance. [RC.1 remains published](rc-1.md), while [beta.7](beta-7.md) is an untagged branch package. TI is not claimed to be in the default catalogue, so use its repository link rather than relying on catalogue search.

## Before installation

Save a fresh backup, export it and verify the downloaded archive. Retain your trial card configuration, resource URL and previous module. Archive integrity is not a restore rehearsal; confirm your recovery method before a trial.

Check ownership of `www/community/thermal-intelligence/`, all resources using that folder prefix, and any existing manual trial resource. Stop if another TI installation or unrelated content uses the same namespace. The [Marketplace resource manager](https://github.com/home-assistant/core/blob/74cf5a49c63ed8d4d87717844bf14f79c28c9cea/homeassistant/components/marketplace/repositories/plugin.py) matches resource prefixes when updating or removing entries. A differently named dashboard does not isolate its files or resources.

Keep legacy TI modules and cards separate. Beta and RC trial modules share `custom:thermal-intelligence-beta-card`; only one of those modules may load in a browser document.

For a manual-to-Marketplace transition, retain the old module and its saved resource details. Before confirming installation, keep affected dashboard clients closed or prevent them from loading or reloading dashboards until the resource transition is complete. After installation, check the generated registration, remove only the old manual trial registration and verify exactly one trial module remains. Preserve every legacy resource and unrelated entry. Only then open a fresh document on each affected client and verify the intended version before using controls. Refresh any client that opened during the overlap after reconciliation as well.

## Add the repository and select a version

1. Open **Settings → Marketplace → Add from link**. Connect GitHub through Home Assistant if requested, then add `https://github.com/senyo888/thermal-intelligence`. If a type is requested, select **Dashboard**.
2. Open Thermal Intelligence, then its three-dot menu → **Install another version**. For a first prerelease installation, choose the exact published tag here; there is no installed-repository Pre-release switch yet.
3. For the published RC.1 trial, explicitly select `v0.1.0-rc.1` and follow its [release record](rc-1.md); Marketplace installation of RC.1 remains unverified. For RC.2, select `v0.1.0-rc.2` only after publication. Verify the intended tag in the confirmation dialog and stop if it is absent. Do not substitute another release, a branch or “latest”.
4. Review the installation dialog and confirm. Storage-mode dashboard resources are registered automatically. For YAML-managed resources, use the URL shown by the installer instead. Do not add a duplicate resource.
5. Finish any resource transition described above, then open a fresh browser document. If Home Assistant reports that `www` did not exist at startup and requires a restart, stop and plan that separately.

These steps follow the [official Marketplace instructions](https://www.home-assistant.io/integrations/marketplace/). The [version selector](https://github.com/home-assistant/frontend/blob/a67b691a451e0b3fc469679b07158f963a61842c/src/panels/marketplace/dialogs/dialog-marketplace-install.ts#L618) supports explicit prerelease selection before installation; update preferences are separate. UI labels can vary with translation.

## Verify the trial

Record the selected version, installer result, installed file list and generated resource URL. Verify the served `thermal-intelligence.js` against the exact release manifest’s size and SHA-256. Identical bytes on another branch do not prove that the intended named version was selected.

Retain the installer-generated resource URL. Do not replace it with the previous manual URL or register a second trial module.

Choose **Add Card → Thermal Intelligence Thermostat · RC**. Confirm the reported version, selected climate entity, readings, editor open/cancel and passive reconnect. These operations must send no thermostat or switch commands. Existing cards keep their saved trial type; the word “beta” in its internal type is not the installed version.

Optional switch enrollment is deliberate and uses schema 2. Read its [eligibility, confirmation and provider side effects](optional-switch-control.md) before enabling it. A reported setting or valve position does not establish physical heating.

## Update and recovery

After installation, enable the repository’s disabled **Pre-release** entity under **Settings → Devices & services → Marketplace**, then turn on that switch if you want future prerelease updates. This is separate from first-install version selection.

Read the release notes and take a fresh backup before an update. Verify the exact new version and served hash again. Test update, removal and recovery separately; installing the same version twice does not prove update behavior.

Home Assistant recommends restoring a backup after a failed update instead of using **Install another version** as a downgrade. A manually restored card module/resource only recovers that frontend surface; it does not restore Marketplace metadata or the whole environment. Use the saved recovery plan for the affected scope. Returning from schema 2 to RC.1 also requires the original schema-1 card configuration. See [migration and rollback](migration.md).

## Existing HACS installations

Home Assistant 2026.11 takes over HACS repositories and update entities through Marketplace. Old `/hacsfiles/` resource paths remain supported; do not rename working URLs merely to match the new product name. Verify migration on the actual installation and do not reinstall HACS on a Marketplace system. See [how Marketplace handles HACS](https://contributors.home-assistant.io/marketplace/how-it-works/).

The repository still uses `hacs.json` and the Dashboard `dist/` layout. That shared packaging contract does not establish a successful TI installation. [Distribution](distribution.md) separates package checks, the historical RC.1 validator result, installer acceptance and catalogue inclusion.
