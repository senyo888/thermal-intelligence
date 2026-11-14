# HACS on Home Assistant before 2026.11

For Home Assistant 2026.11 and later, use [Marketplace](marketplace.md). Do not install HACS alongside Marketplace. The older HACS route below is for systems that still use that integration.

Thermal Intelligence is a **Dashboard** custom repository. It installs a frontend resource, not a TI backend integration. [RC.3](rc-3.md), [RC.2](rc.md) and [RC.1](rc-1.md) are published prereleases. RC.1 passed all eight applicable upstream validator checks on 3 November 2026, but that does not establish installation or update acceptance. See [distribution evidence](distribution.md).

## Controlled installation

1. Save and verify a fresh backup. Retain the current module, resource and card configuration, and establish recovery before changing an installation.
2. Check `www/community/thermal-intelligence/` and its resource namespace for existing ownership. Preserve legacy TI and unrelated files. Follow the [resource checks](marketplace.md#before-installation) before migration.
3. In HACS, choose **Custom repositories** and add `https://github.com/senyo888/thermal-intelligence` as **Dashboard**.
4. Enable prerelease visibility and select the exact published version named in its guide before downloading. For RC.3 select `v0.1.0-rc.3`. Do not substitute the default branch.
5. Verify the installer-generated resource, exact version and served hash. Use one trial registration and a fresh browser document. Select **Thermal Intelligence Thermostat · RC** and check passive rendering, editor cancellation and reconnect before deliberate controls.

For the first prerelease, HACS 2.0.5 can inspect the default branch during repository discovery. The default branch’s separately reviewed snapshot supplies discovery structure; it is not proof of a named-release installation. Select the named RC.3 release for its package. `hide_default_branch` hides a download choice; it does not prove which version was installed. Named-release selection and bytes must both be verified.

Install, update, removal, manual-to-installer migration and recovery still require their own acceptance. A module/resource rollback does not restore installer state or the whole environment. Schema-2 rollback to RC.1 also requires the original schema-1 configuration. See [migration](migration.md).

Adding a custom repository is separate from default catalogue inclusion. Official references: [HACS custom repositories](https://www.hacs.xyz/docs/faq/custom_repositories/) and [Dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/).
