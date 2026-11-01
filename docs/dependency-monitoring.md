# Dependency monitoring

Thermal Intelligence bundles its own frontend code and downloads no runtime modules. Its development dependencies and Home Assistant providers need different checks.

| Dependency | Monitoring and review |
| --- | --- |
| npm tools, including Playwright, esbuild and fixture icons | Weekly Dependabot version-update pull requests to `develop`; minor and patch updates grouped, major upgrades reviewed individually |
| GitHub Actions | Weekly Dependabot pull requests to `develop`; preserve immutable action pins and least-privilege workflow permissions |
| Versatile Thermostat | Review upstream releases for readiness, lock services, restrictions, response observations, climate/valve control and attribute-schema changes |
| Home Assistant Core and Frontend | Review releases and developer notes for climate APIs, registry identity, service calls, custom-card/editor contracts, rendering and resource caching |
| Node.js, Gitleaks and HACS | Review supported runtime/tool versions, verified download hashes and installation compatibility; HACS is not yet a supported TI installation route |

Version-update configuration is read from `.github/dependabot.yml` on the default branch. Security-update pull requests use the default branch; reproduce and review relevant fixes through `develop`. Dependency updates require passing checks and review. They never authorise automatic merges, provider upgrades or changes to an installed system.

The provider watch reports relevant changes and the tests they need. A new upstream version is not automatically a supported version. Preserve the last verified compatibility result when a source is unavailable, and mark coverage unavailable rather than reporting no changes. The [compatibility matrix](compatibility.md) records actual tested versions.

Upstream references: [VT releases](https://github.com/jmcollin78/versatile_thermostat/releases), [Home Assistant releases](https://www.home-assistant.io/blog/categories/release-notes/), [Core](https://github.com/home-assistant/core/releases), [Frontend](https://github.com/home-assistant/frontend/releases), [developer notes](https://contributors.home-assistant.io/blog/), [HACS](https://github.com/hacs/integration/releases), [Node.js releases](https://nodejs.org/en/about/previous-releases) and [Gitleaks](https://github.com/gitleaks/gitleaks/releases).
