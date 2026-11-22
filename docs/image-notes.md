# Image notes

The gallery contains two kinds of images:

- **Beta component captures:** `thermostat.png`, `thermostat-expanded.png`, `preset-details.png` and `lock-controls.png` show the actual beta.2 component with synthetic data. The lock example has no configured code. They illustrate controls retained in RC.3; the captures retain their original beta.2 identity.
- **Anonymised installation examples:** the other thermostat, window and dashboard examples preserve the supplied readings and states while replacing identifying labels. Their exact source builds were not recorded. Some schedule, ownership and cutoff indicators belong to the wider TI system and are outside the standalone release candidate.

Installation images use assisted image editing for anonymisation and were visually compared with the originals. They are illustrative, not pixel-comparison or physical-heating evidence. Original cropping and partially visible rows remain. Personal photo metadata was removed; content credentials are retained where present.

The header is generated presentation artwork, not a screenshot. Documentation and artwork are subject to the separate [reuse terms](licensing-options.md).

## Version 1.0.0 release images

The [release header](../assets/presentation/thermal-intelligence-v1-release-header.png) uses the TI house logo, five top-row icons and artwork made with ImageGen from supplied thermostat captures. The [Plum thermostat](../assets/presentation/thermal-intelligence-v1-plum.png) is a supplied screen capture with its display name edited to read “Thermal Intelligence Thermostat”. Its room reading, target, trend and Idle status are shown as captured. Its originating build was not independently verified.

## Version 1.0.0 settings

[Top row icon settings](../assets/presentation/v1-top-row-settings.png) shows the draft preview, selectable readings, reorder handles and copy action. [Temperature response](../assets/presentation/v1-temperature-response.png) shows the native thermostat route in the dashboard editor. Both are captures of the 1.0.0 module in the standalone browser fixture, using synthetic room data and example entity IDs.

## Project artwork

[The canonical TI logo](../assets/logo.png) is a standalone transparent PNG at `assets/logo.png`. Use this asset for the project mark; page banners and other presentation artwork live in `assets/presentation/`.

The page-specific Wiki title bands and ownership diagram are purpose-built vector artwork. They illustrate documentation topics and responsibility boundaries, rather than a running installation. The original main header is retained. Wiki banners use a transparent house mark extracted from that header with assisted image editing, centred inside each circular motif. Their PNG exports preserve the page titles and vector layouts. Plum highlights identify the TI frontend and its command checks in the architecture artwork and website.

The Humidity Intelligence logo is reused unchanged from the companion project’s `assets/logo.png`, with a link to its project site. It identifies a separate project, not a required TI dependency. Its artwork remains subject to the original owner’s reuse terms.
