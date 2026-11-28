# Install with Home Assistant Marketplace

Thermal Intelligence v1.0.1 is a **Dashboard** card. On Home Assistant 2026.11 or later, open **Settings → Marketplace** and search for **Thermal Intelligence** by **senyo888**. On an older system with HACS, use the [HACS guide](hacs.md).

Already have a Marketplace-managed card? Update its existing entry, then reopen your saved dashboard in a fresh tab. If you added the standalone JavaScript module manually, complete the resource transition below before opening the dashboard. [Update and rollback](migration.md)

## Before installation

Create a fresh backup, export it and verify the downloaded archive. Retain your card configuration, previous module and resource URL. Check which installer or manual registration owns `www/community/thermal-intelligence/` and its resource URLs. Stop if another installation or unrelated files share that directory. Marketplace updates and removes resources by repository-folder prefix. [Marketplace resource manager](https://github.com/home-assistant/core/blob/74cf5a49c63ed8d4d87717844bf14f79c28c9cea/homeassistant/components/marketplace/repositories/plugin.py)

**Moving from a manual installation?** Close affected dashboard tabs before choosing **Install**. After installation, check the generated registration, remove only the previous manual standalone registration, and confirm a single standalone module remains. Preserve separate legacy TI and unrelated resources. Open a fresh tab on each affected client after the transition, including any that reloaded during installation.

<a id="install-100"></a>
<a id="install-the-stable-card"></a>
<a id="add-the-repository-and-select-a-version"></a>

## Find the card and select a version

1. Open the **Dashboard** listing by **senyo888** in Marketplace. Connect GitHub through Home Assistant if prompted.
2. Choose **Install** and confirm **v1.0.1**. If the version is missing, refresh the listing and check the [published release](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.1).
3. For storage-managed resources, Marketplace registers the module. For YAML-managed resources, use the installer URL once. If Home Assistant reports that the new `www` directory requires a restart, plan that separately.
4. Open a fresh dashboard tab. Choose **Edit dashboard → Add card → Thermal Intelligence Thermostat**, select the room’s thermostat and save. [Set up your first room](wiki/Configuration.md)

If the catalogue search returns no match, use **Add from link** with `https://github.com/senyo888/thermal-intelligence` and choose **Dashboard** if prompted. [Official Marketplace instructions](https://www.home-assistant.io/integrations/marketplace/)

## Verify the installation

Check the installed version, the room’s current and target temperatures, and the entity selected in the editor. The v1.0.1 package contains the card module, GPL licence and manifest. Compare the served module with the published size and SHA-256 if the picker or card looks out of date. [Downloads and checksums](compatibility.md#101-package)

## Update and recovery

Use the existing Marketplace entry to update. Keep its generated resource URL and open the saved dashboard in a fresh tab. The tested upgrade from v1.0.0 to v1.0.1 on Home Assistant 2026.11.2 preserved the dashboard configuration and single resource ID. [Verified upgrade](compatibility.md#101-package)

Use a verified backup to recover installer state after a failed update. Replacing a JavaScript file recovers only the frontend. [Update and rollback](migration.md)

## Existing HACS installations

Home Assistant 2026.11 takes over HACS repositories and update entities through Marketplace. Existing `/hacsfiles/` resource URLs are supported. Keep working URLs and verify the installed version before changing resources. [How Marketplace handles HACS](https://contributors.home-assistant.io/marketplace/how-it-works/)
