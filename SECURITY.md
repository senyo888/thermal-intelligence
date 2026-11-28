# Security and privacy

Use [private vulnerability reporting](https://github.com/senyo888/thermal-intelligence/security/advisories/new) to contact **Senyo** about a security issue. Include the affected version or commit, reproduction steps, expected behaviour and redacted evidence. If that route is unavailable, open a contact request without vulnerability details or secrets.

Unintended thermostat commands, misleading readiness, command-target races and secret leakage are relevant reports. Include Home Assistant and provider versions where applicable. Do not put tokens, private URLs, household screenshots, device identifiers or unredacted logs in public issues.

The current stable release is [v1.0.1](https://github.com/senyo888/thermal-intelligence/releases/tag/v1.0.1). Report the exact affected version or source commit, including for older installations. The [compatibility guide](docs/compatibility.md) records tested versions. Project checks cover public-file boundaries, secret scanning, runtime tests, reproducible builds and package contents. Security review complements those checks; it cannot guarantee the absence of vulnerabilities.

If a credential is exposed, revoke or rotate it. Removing a file or adding it to `.gitignore` does not remove earlier copies from Git history.
