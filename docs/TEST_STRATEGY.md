# Test strategy

## Purpose

The Cypress layer proves browser-visible workflows while keeping framework policy independently testable. Configuration and reporting logic should fail in fast Node self-tests before a browser is launched; browser specs then focus on application behavior.

## Gate layers

| Layer | Runner | Browser? | Primary concern |
| --- | --- | ---: | --- |
| Runtime contract | Node self-test | No | URL and timeout validation |
| Reporter contract | Node self-test | No | Manifest shape, redaction, bounds |
| Browser gate | Cypress Chrome | Yes | Critical UI behavior, selectors, isolation |
| Alternate browser | Cypress project/browser selection | Yes | Risk-based compatibility |

## Configuration-negative testing

The runtime self-test verifies rejection of:

- non-absolute base URLs;
- URL credentials;
- query strings/fragments;
- non-positive command-timeout budgets.

`npm run config:check` executes the runtime contract, reporter contract, and then loads the Cypress config. This keeps framework-policy failures distinct from Cypress binary/browser failures.

## Browser-test design

Place assertions at the lowest browser surface capable of proving the user-visible behavior. Avoid duplicating large business-rule matrices already covered by API/unit tests.

Prefer selectors with stable ownership:

1. dedicated test IDs;
2. accessibility/user semantics;
3. stable structural selectors only when no stronger contract exists.

Page objects may compose feature interactions but should not obscure Cypress's native command queue or assertion retries.

## Synchronization policy

Use Cypress retryability and assertions around observable state. Do not use arbitrary `cy.wait(number)` delays for application readiness.

Network aliases/intercepts may be used when the request itself is part of the state transition. They should not become a blanket replacement for asserting visible application state.

## Isolation policy

`testIsolation` remains enabled. Each test owns the state it mutates and must not require a prior test to authenticate, seed data, or navigate.

Fixtures are immutable input examples, not shared mutable application state. Stateful flows should create/reset data through controlled setup mechanisms.

## Retry policy

Run-mode retries are capped; open-mode retries are disabled for interactive debugging. A test that succeeds only on retry is still a defect signal.

Do not increase retry count to compensate for unstable selectors or synchronization. Fix the ownership/readiness contract instead.

## Evidence strategy

On failure, inspect:

1. Cypress assertion/command log;
2. `reports/run-manifest.json` for browser/runtime totals, attempt count, and sanitized bounded error text;
3. screenshot for rendered state;
4. video for sequence/context when enabled;
5. CI/browser installation logs for infrastructure failures.

The manifest removes URL credentials/query/fragment and redacts common credential/token assignments. Screenshots/video are not generally redacted and require synthetic data.

## Failure classification

| Failure class | Interpretation |
| --- | --- |
| Runtime self-test | Framework configuration policy regression |
| Reporter self-test | Evidence/privacy contract regression |
| Cypress verify/startup | Runner/browser infrastructure |
| Selector timeout | UI ownership/state/synchronization problem |
| Assertion | Application-visible contract mismatch |
| Retry-only pass | Reliability/flakiness signal |

## Browser coverage

Chrome is the primary CI browser. Electron or other available browsers are useful for targeted compatibility checks, not automatic duplication of every low-risk case.

Expand the matrix only for known compatibility risk, release criteria, or browser-specific behavior.

## Exit criteria

A UI/framework change is ready when:

- runtime and reporter self-tests pass;
- Cypress configuration loads cleanly;
- the Chrome browser gate passes;
- no fixed wait or hidden assertion retry is added;
- changed selectors remain stable/owned;
- generated structured evidence remains privacy-aware and bounded;
- changes to isolation/retry/evidence policy are reflected in documentation.
