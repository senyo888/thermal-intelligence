# Install with Marketplace

Before installing or updating, [back up Home Assistant and check ownership of the installation folder and its dashboard resources](https://github.com/senyo888/thermal-intelligence/blob/main/docs/marketplace.md#before-installation). Stop if another installation or unrelated files share `www/community/thermal-intelligence/`. If you previously added the module manually, keep its URL and saved card configuration, and close affected dashboard tabs.

If Marketplace already manages v1.0.0, update its existing entry to **v1.0.1**. Keep the generated resource URL and reopen your saved dashboard in a fresh tab. Your card and settings carry over.

On Home Assistant 2026.11 or later, open **Settings → Marketplace** and search for **Thermal Intelligence**. Open the **Dashboard** card by **senyo888**, choose **Install** and confirm [v1.0.1](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.1).

If your catalogue does not show the card yet, choose **Add from link** and enter `https://github.com/senyo888/thermal-intelligence`. Choose **Dashboard** if prompted.

After installation, if Home Assistant manages your resources in storage, keep the registration Marketplace created or updated in place. If you manage dashboard resources in YAML, update the standalone entry to the installer URL or add it once as a JavaScript module. Remove an old manual entry only if a separate duplicate remains. Keep any separate legacy TI resource. [Check the installer URL and dashboard resources](https://github.com/senyo888/thermal-intelligence/blob/main/docs/marketplace.md#find-the-card-and-select-a-version)

For a new card, open a fresh dashboard tab and choose **Edit dashboard → Add card → Thermal Intelligence Thermostat**. Select your room’s thermostat and save. [Set up your first dial](https://github.com/senyo888/thermal-intelligence/wiki/Configuration#get-a-working-dial).

[Verified v1.0.1 downloads and upgrade](https://github.com/senyo888/thermal-intelligence/blob/main/docs/compatibility.md#101-package) · [Update and rollback](https://github.com/senyo888/thermal-intelligence/blob/main/docs/migration.md) · [Earlier Home Assistant versions with HACS](https://github.com/senyo888/thermal-intelligence/wiki/HACS-custom-repository)
