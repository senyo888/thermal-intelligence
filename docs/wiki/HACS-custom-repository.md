# HACS on earlier Home Assistant installations

Before downloading the card, back up Home Assistant and check who owns the installation folder and its resources. If switching from a manual installation, keep the previous module, URL and saved configuration, then close affected dashboard tabs. [HACS installation and resource checks](https://github.com/senyo888/thermal-intelligence/blob/main/docs/hacs.md)

Search HACS for **Thermal Intelligence**, open the **Dashboard** card by **senyo888** and download [v1.0.1](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.1). If HACS already manages your card, update its existing entry.

If the card does not appear in search, open **Custom repositories** and add `https://github.com/senyo888/thermal-intelligence` as **Dashboard**. Open the newly added **Thermal Intelligence** entry, select **v1.0.1** and choose **Download**.

After downloading, check the HACS resource URL. If you manage resources in YAML, update the existing standalone entry or add the HACS URL once as a JavaScript module. Remove an old manual entry only if a separate duplicate remains. Confirm one standalone registration, then open a fresh dashboard tab and choose **Thermal Intelligence Thermostat**.

The v1.0.1 package passed HACS plugin validation. Installation and upgrades on older HACS systems have yet to be verified. [Installer coverage](https://github.com/senyo888/thermal-intelligence/blob/main/docs/distribution.md)

On Home Assistant 2026.11 or later, use [Marketplace](https://github.com/senyo888/thermal-intelligence/wiki/Installing-with-Marketplace). For recovery, follow the [update and rollback guide](https://github.com/senyo888/thermal-intelligence/blob/main/docs/migration.md).
