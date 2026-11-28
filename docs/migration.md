# Update and rollback

For Thermal Intelligence v1.0.1, update the **existing standalone card**. Keep its saved configuration and a single JavaScript module registration. New cards use **Thermal Intelligence Thermostat** in the picker and `custom:thermal-intelligence-thermostat` in YAML.

<a id="update-an-existing-trial-card"></a>

## Marketplace or HACS

Save a backup, then update the existing entry in the installer that owns it. On Home Assistant 2026.11 or later, use [Marketplace](marketplace.md). On older systems using [HACS](hacs.md), use HACS. Retain the generated resource URL. Open a fresh dashboard tab and check the version, thermostat, readings and editor. The Marketplace upgrade from v1.0.0 to v1.0.1 preserved the saved configuration and resource ID on Home Assistant 2026.11.2. [Tested upgrade and package hashes](compatibility.md#101-package)

<a id="update-a-manually-installed-trial-card"></a>

## Manual installation

1. Retain the current module, resource URL and matching card configuration for recovery.
2. Download the [v1.0.1 module](https://github.com/senyo888/thermal-intelligence/releases/download/v1.0.1/thermal-intelligence.js) and check the [published SHA-256](compatibility.md#101-package).
3. Save it with a versioned filename and update the existing standalone resource URL. Keep separately owned legacy and unrelated resources.
4. Open a fresh tab, check the selected thermostat and its readings, then reopen the visual editor to check the configuration. A frontend module update alone does not require a Home Assistant Core restart.

If you want Marketplace to take over a manual installation, complete the [backup and ownership checks](marketplace.md#before-installation) before installing, then [verify the installer URL](marketplace.md#find-the-card-and-select-a-version) before reopening your dashboard.

<a id="trial-and-legacy-coexistence"></a>
<a id="keep-existing-ti-alongside-the-trial-card"></a>

## Existing card types and settings

v1.0.1 reads dashboards saved with the earlier standalone type `custom:thermal-intelligence-beta-card` and its editor. Keep that saved type. The separate `custom:thermal-intelligence-card` resource belongs to the legacy dashboard. Keep its cards and backend in place.

Explicit enrollment of the optional switch uses schema 2. Keep the previous module and compatible configuration together when changing schema. Unknown settings survive editor round trips. Unsupported schema versions are rejected. Earlier two-boundary humidity guides keep their three-band meaning until you select the four-boundary format. [Configuration](card-configuration.md) · [Optional switch](optional-switch-control.md)

<a id="roll-back-a-manually-installed-trial-card"></a>
<a id="installer-managed-recovery"></a>

## Recovery

For a manual installation, restore the previous resource URL and reopen the dashboard in a fresh tab. Restore the compatible saved card configuration if you changed it, preserving unrelated dashboard edits. To remove one saved card, remove only that card. Other dashboard cards share the standalone module. Remove its manual resource registration only when retiring that installation and after confirming that no saved card still uses it. A resource rollback cannot undo a thermostat setting, switch action or VT lock command.

For an installer-managed installation, follow the recovery procedure for that installer and restore the verified backup if needed. A copied module cannot restore installer metadata or the whole Home Assistant environment.

<a id="unreleased-rc4-candidate"></a>
<a id="unreleased-beta8-candidate"></a>
<a id="beta6-optional-switch-configuration"></a>
<a id="version-notes"></a>

## Historical migration notes

Earlier prereleases had version-specific configuration and rollback requirements. The picker suffix identified the release channel. Check the exact installed version before consulting an archived guide. The following records describe those earlier builds.

- [v1.0.0 package and rollback trials](v1.0.0-package.md)
- [RC.4 development record](rc-4.md) and [beta.8 validation](compatibility.md#unreleased-beta8-usability-candidate). These untagged builds introduced additional telemetry fields, top-row configuration and Schedule evidence guards. Earlier modules could preserve unrecognised settings without implementing their behaviour.
- [RC.3 package](rc-3.md), [RC.2 record](rc.md) and [RC.1 record](rc-1.md). Returning to the schema-1 RC.1 module required restoring the saved schema-1 configuration as well.
- [Beta.6 enrollment](beta-6.md) and [beta.7 registry correction](beta-7.md).

| Update | Configuration and rollback behaviour at the time |
| --- | --- |
| RC.2 → RC.3 | No schema or card-type change. Keep the saved configuration and previous module; returning to RC.2 restores its known request-status and presentation defects. |
| RC.1 → RC.2 | Schema 1 remained supported. Optional switch enrollment uses schema 2; returning to RC.1 requires the original schema-1 configuration and module. |
| beta.7 → RC.2 | Existing schema 1 and 2 settings remain supported. RC picker/version identity and current request-status presentation change. |
| beta.6 → beta.7 | No new settings or schema changes. Corrected a false registry mismatch for absent device IDs. Returning to beta.6 can restore the block. |
| beta.1 → beta.2 | Added administrator lock controls without a new option. Codes are entered at runtime and never saved in card configuration. |
| beta.2 → beta.3 | Added optional `response_arc` settings. Unmapped cards retain their existing fallback. Beta.2 preserves the unknown object but cannot display corroborated warming. |
| beta.5 → beta.6 | Optional switch enrollment requires schema 2. Older modules reject it; restore both the saved schema-1 configuration and its module when rolling back. |
| beta.4 → beta.5 | No new settings. Explicitly disabled VT locking no longer shows a residual lock or blocks ordinary controls. Rolling back can restore that false lock block. |
| beta.3 → beta.4 | No new settings. Explicitly null VT Off/Mode reasons show **None reported**. Returning to beta.3 can restore the false amber warning. |
