# Frozen RC.2 release manifest

`manifest.json` is the unchanged manifest published with
[`v0.1.0-rc.2`](https://github.com/senyo888/thermal-intelligence/releases/tag/v0.1.0-rc.2),
source `6d0833f20e9e071d94d2f09f00c1a4d4a34f1805`.
The foundation regression checks its own hash and source identity before comparing
its module and licence hashes with the promoted main snapshot pins. It never reads
the evolving candidate bundle to construct the expected hashes. Other branch-policy
tests use independent synthetic payloads. This fixture is not an installable package.
