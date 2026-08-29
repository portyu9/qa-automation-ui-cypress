# Test strategy

## Purpose

The Cypress layer proves browser-visible workflows while keeping framework policy independently testable and required CI deterministic. Configuration/reporting defects should fail before browser startup; browser specs should then test observable application contracts against a repository-owned target unless an external environment is selected explicitly.

## Gate layers

| Layer | Runner | Target | Primary concern |
| --- | --- | --- | --- |
| Runtime contract | Node self-test | None | URL/timeout validation |
| Reporter contract | Node self-test | None | Manifest mapping, redaction, bounds |
| Primary browser | Cypress Chrome | Local fixture | Critical navigation/authentication behavior |
| Alternate browser | Cypress Firefox | Local fixture | Compatibility |
| Controlled dependency | Cypress + `cy.intercept()` | Local/selected target | Explicit dependency condition |
| Environment integration | Cypress | Explicit `CYPRESS_BASE_URL` | Deployed-system contract |

## Deterministic default target

Required browser CI uses `http://127.0.0.1:3100`. `cypress.config.js` starts `fixture/server.js` from `setupNodeEvents` and closes it from `after:run`.

This contract deliberately excludes:

- public DNS/TLS availability;
- third-party demonstration-site changes;
- external accounts;
- vendor rate limits;
- public-network latency.

Those concerns belong to an explicit deployed-environment layer, not framework correctness.

## Configuration-negative testing

Runtime self-tests reject relative URLs, URL credentials, query/fragment-bearing targets, and non-positive timeout budgets. `npm run config:check` also verifies run-reporting behavior and config loading before Cypress binary/browser execution.

## Browser-test design

Place assertions at the lowest browser surface that proves the user-visible requirement. Avoid duplicating broad business-rule matrices that are better suited to unit/API layers.

Prefer selectors in this order:

1. stable application-owned test IDs;
2. accessibility/user semantics;
3. stable structural selectors only when no stronger contract exists.

Page modules compose feature interactions but must not hide Cypress command queue/retry semantics.

## Authentication coverage

The default browser suite covers both acceptance and rejection:

- valid credentials transition to `/inventory.html` and expose inventory content;
- invalid credentials remain on `/` and expose the stable error contract.

Negative behavior is part of the gate because accepting invalid input can be as significant as rejecting valid input.

## Synchronization policy

Use Cypress query/assertion retryability and observable state. A fixed `cy.wait(number)` is not application readiness.

Use request aliases/intercepts when the request is part of the state transition. Still assert the resulting application state so the test proves user-visible behavior rather than only transport occurrence.

## Isolation policy

`testIsolation` remains enabled. Every test establishes the state it needs. Immutable fixture files are inputs, not shared mutable application state.

Do not rely on test order, a predecessor login, or a browser session left behind by another test.

## Retry policy

Run-mode retries are capped. A retry-only pass is a reliability defect signal and should be classified. Retry count must not be increased to compensate for weak selectors, public-network variability, or missing readiness conditions.

## External environment policy

A deployed environment is selected by setting `CYPRESS_BASE_URL` to a non-default safe HTTP(S) URL. Such execution should be classified separately because failures may belong to deployment state, environment data, networking, or downstream dependencies.

Do not replace the deterministic required gate with a public endpoint merely because the public endpoint appears more end-to-end.

## Evidence strategy

Inspect failures in this order:

1. Cypress assertion/command log;
2. `reports/run-manifest.json` for run/browser/attempt metadata and sanitized bounded error text;
3. screenshot for rendered state;
4. video for sequence/context;
5. CI/bootstrap logs for runner/browser/fixture infrastructure.

Structured evidence removes URL credentials/query/fragment and redacts common credential/token assignments. Screenshots/video can still contain visible data and must use synthetic/controlled inputs.

## Failure classification

| Failure class | First interpretation |
| --- | --- |
| Runtime self-test | Configuration-policy regression |
| Reporter self-test | Evidence/privacy regression |
| Fixture startup/connection | Repository fixture lifecycle/port ownership |
| Cypress verify/startup | Runner/browser infrastructure |
| Navigation failure | HTTP/page-load/application route boundary |
| Selector timeout | UI ownership/readiness |
| Authentication negative mismatch | Rejection/error semantics |
| Browser-specific failure | Compatibility |
| Retry-only pass | Reliability/flakiness |
| Explicit external target failure | Environment/integration first, framework second |

## Browser coverage

Chrome is the primary gate. Firefox is the extended compatibility signal. Add more browser dimensions only for known compatibility risk or release criteria; do not multiply low-risk cases mechanically.

## Exit criteria

A UI/framework change is ready when:

- runtime and reporter self-tests pass;
- Cypress configuration loads cleanly;
- the repository fixture starts and stops cleanly;
- Chrome passes the deterministic browser contract;
- Firefox passes when the extended workflow applies;
- no fixed wait or hidden retry workaround is introduced;
- changed selectors remain stable and application-owned;
- structured evidence remains privacy-aware and bounded;
- any external-target behavior is explicitly classified and documented.
