# RC.2 validation — 12 November 2026

These dated results apply to the published [v0.1.0-rc.2](https://github.com/senyo888/thermal-intelligence/releases/tag/v0.1.0-rc.2), source commit `6d0833f20e9e071d94d2f09f00c1a4d4a34f1805`. They support a controlled prerelease trial, not a stable support guarantee. TI remains a standalone Dashboard card.

The installed module was 199,166 bytes, SHA-256 `626f426b213d58cf142201fb3f97e5e5887e0f795d2b55c02229d663c5c13624`. The released tag, manifest and assets are unchanged. Repository promotion does not upgrade an installation.

## Installation and passive checks

On 9 November, RC.2 was selected explicitly through Home Assistant Marketplace as a custom Dashboard repository. Installer origin, installed files, generated resource and served module hashes matched the named release. Six inert test cards rendered; editor open/cancel and a browser reconnect produced no thermostat or switch commands in the monitored interval. Legacy modules and unrelated resources were preserved. This establishes that bounded manual-to-Marketplace installation, not default catalogue inclusion or the complete update/removal/recovery lifecycle.

Six subsequent generic-thermostat UI commands passed acknowledgement and reported-state checks in the Lab, with original settings restored. VT control checks were deferred while provider updates were staged. The earlier beta.7 inert optional-switch test remains evidence for that build; it is not an RC.2 physical-switch test.

## Two-card trial on an existing installation

On 12 November, two existing trial cards used the exact RC.2 module with Home Assistant **2026.11.1** and VT **10.6.4**, including locally maintained provider extensions and an existing output adapter. This is evidence for that configuration, not certification of every upstream VT installation.

| Check | Observed result |
| --- | --- |
| Bounded card controls | One 0.1 °C increase and one restoration per card; four correlated positive replies and matching provider events. Both original targets restored within 60 seconds. |
| Existing house-policy Boost | One 25-minute cycle; both cards followed the changed provider targets and natural return. No additional TI command or compensating restoration was sent during that cycle. |
| Settings after expiry | Original requested modes, presets and temperatures returned naturally and remained restored. |
| Longer observation | Continuous authenticated observation for 16 minutes 38 seconds after verified return, without collector gaps. This was bounded observation, not a formal soak. |
| Physical heating | The maintainer confirmed physical heating during the trial. This is human observation, not a quantitative heat-delivery measurement or proof for every device. |
| Preservation | Trial resources, saved card configurations and legacy TI remained unchanged during the Boost cycle. |

## Recovered controller incident

One existing output adapter became unavailable for about 10 minutes 16 seconds after Boost expiry, then recovered through its existing automatic recovery. Closely spaced, competing native target requests were recorded. Their event order does not prove completion order or the cause. The final adapter state was confirmed and fault-free, but that does not make the interval an uninterrupted controller-health pass.

The cards continued to display provider requests and mapped observations. **Ready** describes VT initialization; it does not certify a separate adapter, device connection or physical output. The controller incident remains a separate investigation and is not attributed to RC.2 by this record. Another adapter's pre-existing recovery was also outside the two-card acceptance scope.

## Confirmed limitations — 13 November 2026

Subsequent synthetic regressions confirmed three defects in the published RC.2 runtime:

- A climate or VT lock request can retain an earlier matching report if a contradictory report arrives within the same millisecond before the service acknowledgement. The request can then display **Observed** for an obsolete setting. This does not send another command; check current provider state independently of that completion notice.
- An explicitly empty valve mapping can display **TRV unavailable** instead of the selected thermostat's reported activity. An empty mapping disables that source; it does not establish a failed TRV.
- With no header telemetry, a long title can overflow beside a read-only lock indicator.

These findings do not replace the dated installation and trial results above. They remain defects in the released RC.2 assets. Runtime corrections are prepared in the separately reviewed [RC.3 candidate](rc-3.md); none changes the released RC.2 snapshot. The promotion's test fixture now discards delayed observations after a scenario reset, and its registry test completes both pending reads before checking stale-session rejection. Those test corrections do not change installed behavior.

## Remaining acceptance

Physical phone/tablet and Companion coverage, broader thermostat integrations, an RC.2 physical optional-switch test, installer two-version update/removal/recovery, backup restore rehearsal and a formal RC.2 soak remain incomplete. Verified backup exports, archive integrity and database checks provide recovery evidence; they are not a rehearsed restore.

Keep request acknowledgement, provider state, native-device reports, room trends and human-observed heating distinct. The [compatibility record](compatibility.md) preserves earlier results by version, and the [installation guide](marketplace.md) describes the controlled Marketplace route.
