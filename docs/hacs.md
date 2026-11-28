# HACS on Home Assistant before 2026.11

On older Home Assistant systems that already use HACS, install Thermal Intelligence v1.0.1 as a **Dashboard** card. On Home Assistant 2026.11 and later, use [Marketplace](marketplace.md).

## Install the dashboard card

1. Create a fresh backup, export it and verify the downloaded archive. Check who owns `www/community/thermal-intelligence/` and its dashboard resources. Stop if another installation or unrelated files share that folder. If moving from a manual installation, keep the previous module, resource URL and saved card configuration, then close affected dashboard tabs.
2. Search HACS for **Thermal Intelligence** by **senyo888**. If it does not appear, add `https://github.com/senyo888/thermal-intelligence` under **Custom repositories** as **Dashboard**.
3. Open the **Thermal Intelligence** Dashboard entry, select **v1.0.1** and choose **Download**.
4. After the download, check the standalone resource URL shown by HACS. For YAML-managed resources, set the existing standalone entry to that URL or add it once. If a separate old manual entry still exists, remove only that duplicate. Confirm the HACS URL is registered once and keep any separate legacy TI resources.
5. Open a fresh dashboard tab and choose **Edit dashboard → Add card → Thermal Intelligence Thermostat**.
6. Select the room’s thermostat, check its current and target temperatures, and save the card. [First-room guide](wiki/Configuration.md)

For an existing HACS-managed installation, update the existing entry. Keep its generated resource and reopen your saved card. If you need to recover, use the previous module and matching configuration for a manual resource, or the backup for installer state. [Update and rollback](migration.md)

The official Dashboard plugin check passed on the v1.0.1 tag. Installation, update and recovery on older HACS systems remain unverified. The observed saved-card upgrade used Home Assistant Marketplace. [HACS validation](https://github.com/senyo888/thermal-intelligence/actions/runs/46037190950) · [Verified versions and checksums](compatibility.md#101-package)
