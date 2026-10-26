# Thermal Intelligence in different states

These examples show how one card presents different combinations of temperature, trend and thermostat observations. The outer arc, fine slope ring and status chip carry separate information; they do not need to share one colour.

**About these images:** Senyo supplied these installation captures. Names were anonymised using AI-assisted editing; their exact source versions were not recorded. They include ownership, schedule and cutoff indicators from the existing system that are outside the standalone beta's current scope. They illustrate the wider TI interface, not a beta feature checklist, verified heat delivery or compatibility evidence. The [beta guide](beta.md) identifies the tested package.

## A heat request and a reported valve opening

<table>
  <tr><th>Heat requested</th><th>TRV open</th></tr>
  <tr>
    <td valign="top" align="center"><img src="../assets/presentation/heating-request-example.png" alt="Anonymised TI example: 20.1°C, 21°C target, rising 0.12°C per hour and Heat requested, with orange arc and slope ring" width="330"></td>
    <td valign="top" align="center"><img src="../assets/presentation/trv-open-warming-example.png" alt="Anonymised TI example: 19.9°C, 20.5°C target, rising 0.26°C per hour and TRV Open at 100%, with orange arc and slope ring" width="330"></td>
  </tr>
</table>

Both captures show an orange arc and a rising trend. The chips report different facts: a thermostat heat request on the left, and a reported thermostatic radiator valve (TRV) opening on the right. Neither screenshot alone proves accepted output or physical heat transfer. In beta.3, orange additionally requires the configured [response evidence](provider-contracts.md#temperature-response-evidence).

## A closed valve with different temperature trends

<table>
  <tr><th>Closed and falling</th><th>Closed and rising</th></tr>
  <tr>
    <td valign="top" align="center"><img src="../assets/presentation/trv-closed-falling-example.png" alt="Anonymised TI example: 20.6°C, 20.7°C target, falling 0.62°C per hour, TRV Closed at 0%, blue arc and blue slope ring" width="330"></td>
    <td valign="top" align="center"><img src="../assets/presentation/trv-closed-rising-example.png" alt="Anonymised TI example: 19.4°C, 19.5°C target, rising 0.11°C per hour, TRV Closed at 0%, blue arc and orange slope ring" width="330"></td>
  </tr>
</table>

The right-hand card is a useful distinction: the valve reports closed while the room temperature is still rising. Its warm slope ring preserves that observation, while the blue outer arc does not assert an established warming response. Falling temperature on the left is a measured trend; it does not mean an HVAC cooling mode is active.

## Above target, with rising or falling readings

<table>
  <tr><th>Above target and rising</th><th>Above target and falling</th></tr>
  <tr>
    <td valign="top" align="center"><img src="../assets/presentation/trv-above-target-rising-example.png" alt="Anonymised TI example: 20.1°C, 19.5°C target, rising 0.77°C per hour, TRV Closed at 0%, lavender arc and orange slope ring" width="330"></td>
    <td valign="top" align="center"><img src="../assets/presentation/trv-above-target-falling-example.png" alt="Anonymised TI example: 23°C, 19.7°C target, falling 0.92°C per hour, TRV Closed at 0%, lavender arc, blue slope ring and Closed window indicator" width="330"></td>
  </tr>
</table>

Both outer arcs are lavender because the displayed temperature is above target. The fine ring distinguishes rising from falling readings. The header also shows different humidity colours and a **Closed** window observation without replacing the main temperature display.

## Several cards on a wider dashboard

<img src="../assets/presentation/multi-card-dashboard-example.png" alt="Anonymised TI dashboard with eight numbered cards, varied header telemetry, green and lavender outer arcs, blue and orange slope rings, and a partially visible second row" width="100%">

Each card keeps its own readings, target, status and header choices. The original capture includes only part of the second row; some header text is clipped at the horizontal viewport edge. Those limits are retained rather than filled in. This is an illustration of a wider installation layout, not proof of the beta's complete dashboard or physical tablet support.

## Existing detail examples

The supplied **Heat enabled** and **Window detection** captures repeat examples already prepared for the README. Their existing anonymised versions are retained:

<table>
  <tr><th>Heat enabled</th><th>Window detection</th></tr>
  <tr>
    <td valign="top" align="center"><img src="../assets/presentation/thermostat-heat-enabled-example.png" alt="Anonymised TI example showing 21.1°C, Heat enabled and a 20.3°C target" width="330"></td>
    <td valign="top" align="center"><img src="../assets/presentation/window-detection-example.png" alt="Anonymised window-detection detail showing Closed, bypass Off, Frost temperature response and 0% reported TRV opening" width="330"></td>
  </tr>
</table>

Heat enabled describes the selected HVAC mode. The window panel keeps detector state, configured action, delays and reported valve position separate. No readings or UI states were changed to make the examples appear more favourable.
