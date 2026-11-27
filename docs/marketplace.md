# Install with Home Assistant Marketplace

Thermal Intelligence is a **Dashboard** card for the thermostat you already use. On Home Assistant 2026.11 or later, install it through Marketplace. If your older installation uses HACS, follow the [HACS guide](hacs.md).

If you added the standalone TI dashboard resource manually, follow the [resource transition steps](#before-installation) before choosing **Install**. Reopen your dashboards once you have verified that only one standalone TI resource is registered.

## Install 1.0.0

Open **Settings → Marketplace**, search for **Thermal Intelligence** and select the **Dashboard** card by **senyo888**. Choose **Install** and confirm the version. For [v1.0.0](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.0), open a fresh dashboard tab and choose **Edit dashboard → Add card → Thermal Intelligence Thermostat**.

## Before installation

Save a fresh backup, export it and verify the downloaded archive. Retain your trial card configuration, resource URL and previous module. Archive integrity is not a restore rehearsal; confirm your recovery method before a trial.

Check ownership of `www/community/thermal-intelligence/`, all resources using that folder prefix, and any existing manual trial resource. Stop if another TI installation or unrelated content uses the same namespace. The [Marketplace resource manager](https://github.com/home-assistant/core/blob/74cf5a49c63ed8d4d87717844bf14f79c28c9cea/homeassistant/components/marketplace/repositories/plugin.py) matches resource prefixes when updating or removing entries. A differently named dashboard does not isolate its files or resources.

Keep the original TI dashboard resource separate. The 1.0.0 standalone card also registers the beta and RC names so saved cards continue to load. Use one standalone module in each browser session.

For a manual-to-Marketplace transition, retain the old module and its saved resource details. Before confirming installation, keep affected dashboard clients closed or prevent them from loading or reloading dashboards until the resource transition is complete. After installation, check the generated registration, remove only the old manual trial registration and verify exactly one trial module remains. Preserve every legacy resource and unrelated entry. Only then open a fresh document on each affected client and verify the intended version before using controls. Refresh any client that opened during the overlap after reconciliation as well.

<a id="add-the-repository-and-select-a-version"></a>

## Find the card and select a version

1. Open **Settings → Marketplace** and search for **Thermal Intelligence**. Choose the Dashboard card from `senyo888/thermal-intelligence`. Connect GitHub through Home Assistant if requested.
2. Select **Install** and check the version offered. To pick a different published tag, open the three-dot menu and choose **Install another version**.
3. For the first stable version, select **v1.0.0**. If it is missing, check the releases page and refresh Marketplace information. For the RC.3 prerelease, explicitly select **v0.1.0-rc.3**. Confirm the exact tag before continuing.
4. Review the installation dialog and confirm. Storage-mode resources are registered automatically. For YAML-managed resources, use the installer URL; do not add a duplicate.
5. Finish the resource transition above, then open a fresh browser document. If Home Assistant says that `www` did not exist at startup and needs a restart, stop and plan that separately.

If the listing does not appear in search, use **Add from link** in Marketplace and enter `https://github.com/senyo888/thermal-intelligence`. Choose **Dashboard** if prompted, then continue with the same version and resource checks.

These steps follow the [official Marketplace instructions](https://www.home-assistant.io/integrations/marketplace/). The [version selector](https://github.com/home-assistant/frontend/blob/a67b691a451e0b3fc469679b07158f963a61842c/src/panels/marketplace/dialogs/dialog-marketplace-install.ts#L618) supports explicit prerelease selection before installation; update preferences are separate. UI labels can vary with translation.

## Verify the installation

Reload the dashboard in a new browser session and check the card version. For v1.0.0, Marketplace downloads the attached card, GPL licence and release manifest. TI prepares stable releases from `main`. A release tag identifies the exact download even as that branch moves on. [How Marketplace selects versions](https://contributors.home-assistant.io/marketplace/how-it-works/) · [1.0.0 package verification](v1.0.0-package.md#validation-boundaries)

Record the selected version, installer result, installed file list and generated resource URL. Verify the served `thermal-intelligence.js` against the exact release manifest’s size and SHA-256. Identical bytes on another branch do not prove that the intended named version was selected.

Retain the installer-generated resource URL. Do not replace it with the previous manual URL or register a second trial module.

For 1.0.0 choose **Add card → Thermal Intelligence Thermostat**. RC.3 adds **· RC** to the name. Confirm the reported version, selected climate entity, readings, editor open/cancel and passive reconnect. These operations must send no thermostat or switch commands. Existing cards keep their saved trial type; the word “beta” in its internal type is not the installed version.

Optional switch enrollment is deliberate and uses schema 2. Read its [eligibility, confirmation and provider side effects](optional-switch-control.md) before enabling it. A reported setting or valve position does not establish physical heating.

## Update and recovery

After installation, enable the repository’s disabled **Pre-release** entity under **Settings → Devices & services → Marketplace**, then turn on that switch if you want future prerelease updates. This is separate from first-install version selection.

Read the release notes and take a fresh backup before an update. Verify the exact new version and served hash again. Test update, removal and recovery separately; installing the same version twice does not prove update behavior.

Home Assistant recommends restoring a backup after a failed update instead of using **Install another version** as a downgrade. A manually restored card module/resource only recovers that frontend surface; it does not restore Marketplace metadata or the whole environment. Use the saved recovery plan for the affected scope. Returning from schema 2 to RC.1 also requires the original schema-1 card configuration. See [migration and rollback](migration.md).

## Existing HACS installations

Home Assistant 2026.11 takes over HACS repositories and update entities through Marketplace. Old `/hacsfiles/` resource paths remain supported; do not rename working URLs merely to match the new product name. Verify migration on the actual installation and do not reinstall HACS on a Marketplace system. See [how Marketplace handles HACS](https://contributors.home-assistant.io/marketplace/how-it-works/).

The repository uses `hacs.json` and the Dashboard `dist/` layout. On Home Assistant 2026.11.2, a fresh Marketplace installation selected the public v1.0.0 tag and served all three files with matching checksums. [Package verification](v1.0.0-package.md#validation-boundaries) · [Distribution and catalogue status](distribution.md)
