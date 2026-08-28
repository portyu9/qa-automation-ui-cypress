# UI test strategy

## Scope

Use Cypress for browser behavior and critical user workflows. Put combinatorial business rules, service validation, and data-layer checks in faster test layers when a browser adds no signal.

## Selector policy

Dedicated `data-test` identifiers form the preferred automation contract in this repository. Selectors should describe stable semantic elements, not CSS presentation or DOM nesting.

## Waiting policy

Rely on Cypress retryability and observable assertions. For network-triggered transitions, alias the request and wait for the alias plus the UI condition. Avoid arbitrary time delays.

## Data policy

Tests create or select independent data and must not rely on suite order. Credentials and mutable shared accounts should be minimized. Use API/database setup tasks only when they are outside the behavior being tested.

## Retry policy

Run mode has a bounded retry count to preserve failure evidence for transient browser/environment issues. A retry pass remains a flake signal. Persistent or recurring retry-dependent tests should be quarantined only with ownership and a remediation issue, not silently accepted.

## Evidence

Cypress captures screenshots on run failure. CI retains screenshots, downloads, and video directories when present. Node-task logs include a run ID for correlation. Never emit passwords, cookies, tokens, or sensitive form values into task logs.

## Browser coverage

Chrome is the pull-request gate. Electron is available as a fast local alternative. Additional Chrome/Firefox/Edge coverage should be applied to critical flows based on supported-browser risk rather than mechanically multiplying every spec.
