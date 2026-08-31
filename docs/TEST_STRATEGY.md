# Test strategy

## Purpose

The Cypress layer proves browser-visible workflows while keeping framework policy independently testable and required CI deterministic. Configuration/reporting defects should fail before browser startup; browser specs should then test observable application contracts against a repository-owned target unless an external environment is selected explicitly.

## Gate layers

| Layer | Runner | Target | Primary concern |
| --- | --- | --- | --- |
| Runtime contract | Node self-test | None | URL/timeout/correlation validation |
| Reporter/evidence contract | Node self-test | None | Manifest mapping, redaction, bounds, terminal-state reconciliation, execution floor |
| Workflow supply-chain contract | Node self-test | Repository workflows | Full immutable Action SHA pinning |
| Primary browser | Cypress Chrome + Node 24.20.0 | Local fixture | Current-LTS critical navigation/authentication behavior |
| Native command/state | Cypress Chrome | Local fixture | Intercepts, aliases, tasks, sessions, timers |
| Browser compatibility | Cypress Firefox + Node 24.20.0 | Local fixture | Alternate-browser risk with runtime held constant |
| Runtime compatibility | Cypress Chrome + Node 22.23.2 | Local fixture | Maintenance-LTS risk with browser held constant |
| Controlled dependency | Cypress + `cy.intercept()` | Local/selected target | Explicit dependency condition |
| Environment integration | Cypress | Explicit `CYPRESS_BASE_URL` | Deployed-system contract |
| Security | CodeQL + npm Audit + Trivy + Dependency Review | Repository / dependency graph / PR delta | Source, advisory, configuration/secret, and newly introduced dependency risk |

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

Runtime self-tests reject relative URLs, URL credentials, query/fragment-bearing targets, explicit target port `0`, non-positive timeout budgets, unsafe correlation tokens, and overlong run IDs. Text inputs are normalized once at the runtime boundary.

`npm run config:check` also verifies run-reporting behavior, evidence policy, Cypress config loading, and immutable workflow Action pins before Cypress binary/browser execution. CI installs the locked dependency graph with lifecycle scripts disabled, then explicitly invokes the Cypress binary installer as the only required installation side effect.

## Native command/state coverage

The capability suite exists to prove framework-relevant Cypress semantics, not to enumerate the API.

- `cy.stubJson()` remains a narrow JSON interception helper and returns the native Cypress chain.
- Aliases are declared without an `@` prefix and consumed through `cy.wait('@alias')`.
- Intercept assertions verify request/response details and then assert resulting DOM state.
- `cy.task()` is reserved for allowlisted Node-side behavior owned by `setupNodeEvents`.
- `cy.session()` must define a `validate()` contract before restored browser state is trusted.
- `cy.request()` is preferred when an HTTP assertion does not require browser rendering.
- `cy.clock()`/`cy.tick()` replace wall-clock waits for deterministic timer behavior.

Custom commands should return the terminal Cypress chain so callers can compose them without relying on incidental queue behavior.

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

Time-dependent application behavior should use `cy.clock()`/`cy.tick()` when the timer itself is the requirement rather than waiting for elapsed wall time.

## Isolation policy

`testIsolation` remains enabled. Every test establishes the state it needs. Immutable fixture files are inputs, not shared mutable application state.

Session caching does not weaken this rule: a `cy.session()` entry must have explicit setup and validation and must not depend on a predecessor test.

Do not rely on test order, a predecessor login, or a browser session left behind by another test.

## Cross-origin policy

The deterministic committed fixture remains single-origin. If a real product flow crosses origins—for example SSO, a payment provider, or a federated application boundary—add a deterministic second origin and use `cy.origin()` for commands executed there.

Do not introduce `cy.origin()` or a public remote origin merely to increase feature breadth. The capability belongs only when the product owns a real multi-origin requirement.

## Retry and evidence policy

Run-mode retries are capped. A retry-only pass is a reliability defect signal and should be classified. Retry count must not be increased to compensate for weak selectors, public-network variability, or missing readiness conditions.

Both primary and compatibility workflows run `config/retryPolicy.js` after Cypress. A required run must satisfy all of the following:

- the manifest contains runs and projected test records;
- top-level test totals equal the projected test count;
- passed, failed, pending, and skipped totals reconcile with per-test terminal states;
- at least **five tests actually execute** (`passed + failed`), matching the current required-suite floor;
- required lanes contain no pending or skipped tests;
- terminal failures cannot be represented as clean evidence;
- retry-recovered passes remain failures.

This floor is intentionally stronger than “at least one test.” A suite that silently shrinks from five contracts to one has not preserved the same quality signal even if the remaining test passes.

## External environment policy

A deployed environment is selected by setting `CYPRESS_BASE_URL` to a non-default safe HTTP(S) URL. Such execution should be classified separately because failures may belong to deployment state, environment data, networking, or downstream dependencies.

Do not replace the deterministic required gate with a public endpoint merely because the public endpoint appears more end-to-end.

## Evidence strategy

Inspect failures in this order:

1. Cypress assertion/command log;
2. `reports/run-manifest.json` for reviewed run/browser/spec/test metadata and sanitized bounded error text;
3. screenshot for rendered state;
4. video for sequence/context;
5. CI/bootstrap logs for runner/browser/fixture infrastructure.

The manifest is an **allowlisted evidence projection**, not a serialized copy of Cypress's `after:run` result object. It retains only reviewed browser/platform/runtime labels, normalized totals, per-spec allowlisted stats, and bounded/redacted test state. Unknown properties from Cypress result objects are discarded by default. Non-finite/negative numeric values are normalized rather than persisted as arbitrary runtime data.

Structured evidence removes URL credentials/query/fragment and redacts common credential/token assignments. Screenshots/video can still contain visible data and must use synthetic/controlled inputs.

Stable status interfaces are `ci / ci-gate`, `extended / extended-gate`, and `security / security-gate`. Matrix internals can evolve without forcing every consumer to track individual job names.

## Security strategy

Security is an independent failure domain and is not retried as browser flakiness:

- CodeQL performs JavaScript/TypeScript SAST with the extended query suite;
- npm Audit gates known HIGH/CRITICAL advisories in the installed lockfile graph and retains JSON evidence;
- Trivy scans the repository filesystem for fixed HIGH/CRITICAL dependency findings, supported HIGH/CRITICAL misconfiguration findings, and committed secret findings;
- GitHub Dependency Review evaluates pull-request dependency deltas when the repository Dependency graph is available.

If GitHub Dependency graph is unavailable, the workflow records that limitation. npm Audit and Trivy remain independent required gates but are not represented as equivalent to change-aware dependency-diff analysis.

## Failure classification

| Failure class | First interpretation |
| --- | --- |
| Runtime self-test | Configuration-policy regression |
| Reporter/evidence self-test | Evidence/privacy/schema/reconciliation regression |
| Workflow-pin self-test | Mutable executable CI dependency introduced |
| Fixture startup/connection | Repository fixture lifecycle/port ownership |
| Cypress verify/startup | Runner/browser infrastructure |
| Intercept/session/task/clock contract | Native command/state ownership |
| Navigation failure | HTTP/page-load/application route boundary |
| Selector timeout | UI ownership/readiness |
| Authentication negative mismatch | Rejection/error semantics |
| Firefox-only failure | Browser compatibility on current LTS |
| Node-22/Chrome-only failure | Maintenance-LTS runtime compatibility |
| Retry-only pass | Reliability/flakiness |
| Execution-floor/count mismatch | Discovery, disabled-test, or reporter-integrity regression |
| CodeQL | Source-level security defect |
| npm Audit | Known npm dependency advisory |
| Trivy | Dependency/configuration/secret risk |
| Dependency Review | Newly introduced dependency risk or unavailable GitHub Dependency graph |
| Explicit external target failure | Environment/integration first, framework second |

## Browser and runtime coverage

The fast required CI lane is **Node 24.20.0 + Chrome**. Extended compatibility deliberately tests independent risk axes rather than a redundant Cartesian matrix:

- **Node 24.20.0 + Firefox** qualifies alternate-browser behavior while holding the current-LTS runtime constant;
- **Node 22.23.2 + Chrome** qualifies the maintenance-LTS runtime while holding the primary browser constant.

npm **11.19.1** is installed and verified exactly in both runtime generations. Add more browser/runtime combinations only for known compatibility risk or release criteria. If a defect suggests an interaction between two dimensions, add that combination intentionally rather than multiplying all cases mechanically.

## Exit criteria

A UI/framework change is ready when:

- runtime, reporter/evidence, workflow-pin, and Cypress configuration self-tests pass;
- correlation/runtime inputs and explicit port `0` fail closed before browser startup;
- custom commands preserve native chain semantics;
- session/intercept/timer capability contracts pass;
- the repository fixture starts and stops cleanly;
- Chrome on Node 24.20.0 passes the deterministic primary browser contract;
- Firefox on Node 24.20.0 passes when the browser-compatibility workflow applies;
- Chrome on Node 22.23.2 passes when the maintenance-LTS workflow applies;
- the run manifest proves at least five executed tests, reconciled terminal-state counts, and zero pending/skipped cases;
- retry-recovered passes remain failing reliability signals;
- no fixed wait or hidden retry workaround is introduced;
- changed selectors remain stable and application-owned;
- structured evidence remains privacy-aware, bounded, numeric-safe, and explicitly allowlisted;
- npm 11.19.1 is verified exactly before dependency work;
- CodeQL, npm Audit, and Trivy security gates pass, and Dependency Review runs when GitHub Dependency graph is available;
- any external-target behavior is explicitly classified and documented.
