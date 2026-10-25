# Security reporting and privacy

Status: public foundation, with no supported runtime release yet. GitHub private vulnerability reporting is enabled for this repository.

Use [Report a vulnerability](https://github.com/senyo888/thermal-intelligence/security/advisories/new) to contact Senyo privately. Include the affected commit/version, expected and actual behavior, reproduction and redacted evidence. If the route is unavailable, open a contact request containing no vulnerability details or secrets.

Do not put vulnerabilities, tokens, private URLs, device identifiers, home topology, household screenshots or unredacted logs in public issues.

Treat unintended heating commands, misleading readiness/activity, command target races and secret leakage as material security/safety reports. Record affected library/HA/provider versions, reproduction and redacted evidence. Accepted dispatch is not proof of physical action.

The foundation workflow checks tracked-file boundaries and documentation structure. Gitleaks scans of the candidate tree and Git history are separate publication checks; dependency/rights and bundle/source-map review apply as software is added. Do not broaden scanner allowlists merely to hide private fixtures or reports. If a secret is exposed, revoke/rotate it; deletion alone is not remediation.
