# VT lock control

The compact icon beside the thermostat name shows the lock state reported by **Versatile Thermostat (VT)**. From beta.2, a confirmed Home Assistant administrator can tap it to open a small control dialog when the card has verified the thermostat and its lock capabilities. Other accounts retain the read-only indicator.

## Use the lock

1. Tap the lock icon. Opening the dialog changes nothing.
2. Check the thermostat name, current lock state and the scope of the lock.
3. If VT has a code configured, enter it in **Lock code**. VT requires that code for both locking and unlocking; being an administrator does not bypass it.
4. Select **Lock thermostat** or **Unlock thermostat**. TI waits for the service response and a fresh matching VT state before reporting the outcome.

The action is fixed when the dialog opens. If the state or relevant context changes before submission, reopen the dialog rather than acting on an outdated intention. Closing after submission does not cancel a request already sent. A pending or uncertain request is never automatically retried.

VT decides whether the lock blocks users, automations, or both. A user lock also restricts administrators' ordinary thermostat controls. An automation-only lock can coexist with enabled user controls. Locking does not turn off heating or disable VT's internal regulation and protections.

If VT reports an automatic relock delay, the dialog explains it. VT owns that timer; TI follows the reported state and does not run its own relock timer or reset it by resending an unnecessary unlock.

## When control is unavailable

The indicator remains read-only unless the account is confirmed as an administrator, the card is connected outside preview/editing, the selected entity has a verified VT registry identity, VT reports it ready and available, the lock is configured, lock state, code requirement, user/automation scope and automatic relock delay are known, at least one lock scope is enabled, and both native lock/unlock services are available. Missing information does not become permission to send a command. Ordinary climate controls retain their existing lock restrictions.

No additional card option is required, and saved configurations remain valid. The icon stays 14 px; the interactive version reserves a 44 px touch and keyboard target without covering nearby controls. Generic thermostat lock control is outside this beta's scope.

## Code handling and provider limits

TI keeps the entered code out of saved card configuration, copied settings, request status and its own diagnostics. The field is cleared on submission, dismissal or invalidated context; raw provider errors are not displayed. The code is sent to Home Assistant for VT to validate. This does not guarantee erasure from browser/transport memory or prevent Home Assistant, VT or external event listeners from recording transmitted data.

The inspected **VT 10.5.1** implementation includes the attempted code in an invalid-code exception. TI suppresses that error text but does not repair upstream logging behavior. [VT lock implementation](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/feature_lock_manager.py), [native service definitions](https://github.com/jmcollin78/versatile_thermostat/blob/10.5.1/custom_components/versatile_thermostat/services.yaml).

Administrator-only interaction is a TI interface restriction. Home Assistant and VT remain responsible for backend permissions and code validation. See the [command contract](https://github.com/senyo888/thermal-intelligence/blob/main/docs/command-contract.md) and [exact beta evidence](https://github.com/senyo888/thermal-intelligence/blob/main/docs/beta.md) for implementation and validation boundaries.
