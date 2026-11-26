# HACS on Home Assistant before 2026.11

Use this guide on older Home Assistant installations that already use HACS. On Home Assistant 2026.11 or later, use [Marketplace](marketplace.md). Thermal Intelligence is listed in the HACS catalogue under **Dashboard**. Check the [releases page](https://github.com/senyo888/thermal-intelligence/releases) for the available tags. HACS installation and update coverage is recorded in [Distribution](distribution.md).

## Install the dashboard card

1. Save and verify a fresh backup. Retain the current module, resource and card configuration, and establish recovery before changing an installation.
2. Check `www/community/thermal-intelligence/` and its resource namespace for existing ownership. Preserve legacy TI and unrelated files. Follow the [resource checks](marketplace.md#before-installation) before migration.
3. In **HACS**, search for **Thermal Intelligence** and open the **Dashboard** card from `senyo888/thermal-intelligence`.
4. For the stable version select [**v1.0.0**](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.0). To install RC.3, enable prerelease visibility and select **v0.1.0-rc.3**. Check the named version before downloading.
5. Verify the installer-generated resource, exact version and served hash. Use one standalone card resource and a fresh browser document. Select **Thermal Intelligence Thermostat** for 1.0.0 or **Thermal Intelligence Thermostat · RC** for RC.3 and check passive rendering, editor cancellation and reconnect before deliberate controls.

If search does not show TI, open **Custom repositories**, add `https://github.com/senyo888/thermal-intelligence` as **Dashboard**, then follow the same download steps.

For the first prerelease, HACS 2.0.5 can inspect the default branch during repository discovery. The default branch’s separately reviewed snapshot supplies discovery structure; it is not proof of a named-release installation. Select the tag that matches the package you want. `hide_default_branch` hides a download choice; it does not prove which version was installed. Named-release selection and bytes must both be verified.

Install, update, removal, manual-to-installer migration and recovery still require their own acceptance. A module/resource rollback does not restore installer state or the whole environment. Schema-2 rollback to RC.1 also requires the original schema-1 configuration. See [migration](migration.md).

All eight [HACS plugin checks](https://github.com/senyo888/thermal-intelligence/actions/runs/45459007561) passed for v1.0.0. HACS accepted the [catalogue entry](https://github.com/hacs/default/pull/14872) on 26 November 2026. [Dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/)
