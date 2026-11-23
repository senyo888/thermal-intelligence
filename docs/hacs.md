# HACS on Home Assistant before 2026.11

Use this guide on older Home Assistant installations that already use HACS. On Home Assistant 2026.11 or later, use [Marketplace](marketplace.md). Thermal Intelligence is a **Dashboard** custom repository. Check the [releases page](https://github.com/senyo888/thermal-intelligence/releases) for the available tags. HACS installation and update coverage is recorded in [Distribution](distribution.md).

## Controlled installation

1. Save and verify a fresh backup. Retain the current module, resource and card configuration, and establish recovery before changing an installation.
2. Check `www/community/thermal-intelligence/` and its resource namespace for existing ownership. Preserve legacy TI and unrelated files. Follow the [resource checks](marketplace.md#before-installation) before migration.
3. In HACS, choose **Custom repositories** and add `https://github.com/senyo888/thermal-intelligence` as **Dashboard**.
4. For the stable version select **v1.0.0** when it appears in HACS. To install RC.3, enable prerelease visibility and select **v0.1.0-rc.3**. Check the named version before downloading.
5. Verify the installer-generated resource, exact version and served hash. Use one trial registration and a fresh browser document. Select **Thermal Intelligence Thermostat** for 1.0.0 or **Thermal Intelligence Thermostat · RC** for RC.3 and check passive rendering, editor cancellation and reconnect before deliberate controls.

For the first prerelease, HACS 2.0.5 can inspect the default branch during repository discovery. The default branch’s separately reviewed snapshot supplies discovery structure; it is not proof of a named-release installation. Select the tag that matches the package you want. `hide_default_branch` hides a download choice; it does not prove which version was installed. Named-release selection and bytes must both be verified.

Install, update, removal, manual-to-installer migration and recovery still require their own acceptance. A module/resource rollback does not restore installer state or the whole environment. Schema-2 rollback to RC.1 also requires the original schema-1 configuration. See [migration](migration.md).

Adding a custom repository is separate from default catalogue inclusion. Official references: [HACS custom repositories](https://www.hacs.xyz/docs/faq/custom_repositories/) and [Dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/).
