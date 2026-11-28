# HACS on earlier Home Assistant installations

In HACS, search for **Thermal Intelligence**, open the **Dashboard** card by **senyo888** and download [v1.0.1](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.1). If HACS already manages your card, update the existing entry. If you registered a module manually, follow the resource transition steps before installation. Open a fresh dashboard tab and choose **Thermal Intelligence Thermostat**. [HACS installation and resource checks](https://github.com/senyo888/thermal-intelligence/blob/main/docs/hacs.md)

If the card does not appear in search, open **Custom repositories** and add `https://github.com/senyo888/thermal-intelligence` as **Dashboard**. Open the newly added **Thermal Intelligence** entry, select **v1.0.1** and choose **Download**.

The v1.0.1 package passed HACS plugin validation. Installation and upgrades on older HACS systems have yet to be verified. [Installer coverage](https://github.com/senyo888/thermal-intelligence/blob/main/docs/distribution.md)

On Home Assistant 2026.11 or later, use [Marketplace](https://github.com/senyo888/thermal-intelligence/wiki/Installing-with-Marketplace). For recovery, follow the [update and rollback guide](https://github.com/senyo888/thermal-intelligence/blob/main/docs/migration.md).
