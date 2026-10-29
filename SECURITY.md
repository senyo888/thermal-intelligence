# Security and privacy

Use [private vulnerability reporting](https://github.com/senyo888/thermal-intelligence/security/advisories/new) to contact **Senyo** about a security issue. Include the affected version or commit, reproduction steps, expected behaviour and redacted evidence. If that route is unavailable, open a contact request without vulnerability details or secrets.

Unintended thermostat commands, misleading readiness, command-target races and secret leakage are relevant reports. Include Home Assistant and provider versions where applicable. Do not put tokens, private URLs, household screenshots, device identifiers or unredacted logs in public issues.

The current candidate is an untagged release candidate; a stable support range has not been established. Project checks cover public-file boundaries, secret scanning, runtime tests, reproducible builds and package contents. Security review complements those checks; it cannot guarantee the absence of vulnerabilities.

If a credential is exposed, revoke or rotate it. Removing a file or adding it to `.gitignore` does not remove earlier copies from Git history.
