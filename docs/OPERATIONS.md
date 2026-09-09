# Operations Guide

## Purpose

This guide owns the detailed operating contract for the Cypress UI Quality Engineering Framework: local execution, runtime configuration, deterministic fixture ownership, native command-queue capabilities, synchronization, network/cross-origin policy, evidence, security, dependency maintenance, and failure triage.

The main [`README.md`](../README.md) is intentionally a concise entry point. Deep runtime and lifecycle design remains in [`ARCHITECTURE.md`](ARCHITECTURE.md), while browser/runtime risk selection and exit criteria remain in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

## Local execution

```bash
npm ci --ignore-scripts
npm run cypress:install
npm run config:check
npm run cypress:verify
npm run test:chrome
python .github/scripts/validate_readme.py
```

No application process is required for the default run; Cypress owns the repository fixture lifecycle.

```bash
# browser compatibility
npm run test:firefox

# explicit deployed integration target
CYPRESS_BASE_URL=https://test.example.internal npm run test:chrome
```

## Target classes

| Target class | Purpose | Required CI? |
| --- | --- | ---: |
| Repository fixture | Deterministic framework/browser contract | Yes |
| `cy.intercept()` condition | Controlled dependency scenario | When behavior requires it |
| Explicit deployed target | Environment/integration contract | No |

Required CI uses the repository-owned loopback application at `http://127.0.0.1:3100`. Public-site availability is not part of framework health.

## Runtime configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `CYPRESS_BASE_URL` | Application target | `http://127.0.0.1:3100` |
| `CYPRESS_COMMAND_TIMEOUT_MS` | Command/assertion retry budget | `10000` |
| `CYPRESS_REQUEST_TIMEOUT_MS` | Request connection budget | `10000` |
| `CYPRESS_RESPONSE_TIMEOUT_MS` | Response budget | `30000` |
| `CYPRESS_PAGE_LOAD_TIMEOUT_MS` | Page-load budget | `60000` |
| `TEST_RUN_ID` | Run/evidence correlation | generated / CI run ID |

URLs must be absolute HTTP(S), contain a hostname, reject explicit port `0`, and contain no credentials, query strings, or fragments. Unsafe configuration fails before browser execution.

Operator-provided run IDs are bounded correlation tokens rather than arbitrary payload carriers.

## Deterministic application fixture

`fixture/server.js` supplies `/health`, `/`, `/inventory.html`, the deterministic capability page, and accepted/rejected authentication using Node's built-in HTTP server. It intentionally has no public APIs, third-party assets, DNS, or TLS dependencies.

`setupNodeEvents` starts the fixture only when the configured base URL is the committed default. `after:run` closes it after evidence generation. A non-default `CYPRESS_BASE_URL` therefore selects a separate deployed integration path rather than silently mixing local and external behavior.

The fixture exists to prove Cypress-specific behavior under controlled conditions; it is not a second product framework.

## Page modules and selectors

Page modules expose feature actions and owned locators, not renamed Cypress primitives.

```js
cy.get('[data-test="login-button"]').click();
cy.get('[data-test="inventory-item"]').should('have.length.at.least', 1);
```

Stable application-owned `data-test` hooks are preferred over styling classes, DOM depth, or incidental structure.

## Native command-queue capability surface

`cypress/e2e/capabilities.cy.js` keeps first-class Cypress behavior executable:

- `cy.stubJson()` creates an owned `cy.intercept()` response, requires a meaningful alias, and leaves native interception semantics visible;
- `cy.wait('@alias')` proves request method/status/body before resulting UI assertions;
- `cy.task()` exercises an allowlisted browser-to-Node plugin boundary without becoming a hidden assertion channel;
- `cy.session()` restores cached browser state only with an explicit `validate()` contract;
- `cy.request()` handles non-UI setup/validation when rendering is not the subject;
- `cy.clock()` and `cy.tick()` prove timer transitions at exact logical boundaries without real-time sleep.

The objective is not API count. Cypress's queue, retryability, browser state, plugin boundary, interception, and fake-time model remain visible rather than being hidden behind a second asynchronous framework.

## Synchronization model

Use Cypress queries and `.should()` as the primary readiness mechanism. For request-driven behavior, wait for the actual request/response and then assert the resulting UI state.

```js
cy.wait(3000); // anti-pattern: elapsed time is not a system condition
```

A useful timeout identifies which observable state never became true. Fixed elapsed-time waits are not readiness contracts.

## Authentication and sensitive input

The suite proves both accepted and rejected credentials. Password typing uses `{ log: false }`; this reduces command-log exposure but does not make real credentials appropriate test data.

Deployed credentials belong in secure environment-specific configuration. Generic evidence must not retain passwords, authorization headers, cookies, or arbitrary response payloads.

## Network stubbing policy

`cy.intercept()` is appropriate when the test deliberately owns a dependency condition such as an error, latency model, request shape, or deterministic response.

Do not stub every integration until the browser suite can only prove its own mocks. A reusable interception helper is justified only when it enforces stable response/ownership policy; assertions should continue to inspect native Cypress interception objects.

## Cross-origin policy

The deterministic fixture is intentionally single-origin. Modern Cypress requires `cy.origin()` when commands in one test execute after navigation to another origin.

Add a deterministic second-origin fixture and a `cy.origin()` contract only when the real product owns cross-origin behavior such as federated authentication, payment handoff, or another separately controlled origin. Do not add cross-origin complexity simply to increase API coverage or make a public dependency part of required CI.

## Evidence and CI

Cypress-native screenshots and video remain authoritative. `config/runReporter.js` creates a compact privacy-aware run manifest rather than serializing Cypress's broad result object.

Required lanes independently reconcile aggregate counts with per-test terminal states, require at least five actually executed tests, reject pending/skipped tests, and reject retry-recovered passes. Artifact upload success therefore cannot substitute for meaningful executed browser work.

Primary CI runs **Node + Chrome** after runtime/reporter/workflow-pin checks and Cypress binary verification. Extended CI changes one compatibility dimension at a time:

- **Node + Firefox** isolates browser compatibility while runtime stays fixed;
- **maintenance-LTS Node + Chrome** isolates runtime compatibility while the primary browser stays fixed.

Stable aggregate workflow conclusions are:

- `ci / ci-gate`;
- `extended / extended-gate`;
- `security / security-gate`.

Repository rules/settings are a separate governance layer and are not implied by those workflow contracts.

## Evidence privacy

The run manifest is an explicit allowlisted projection containing bounded run identity, sanitized target, browser/runtime labels, normalized totals, bounded spec/test identity, attempts, terminal state, and bounded/redacted final error text.

Unknown third-party result fields are ignored unless deliberately reviewed. URLs lose credentials/query/fragment, common credential assignments are redacted, and labels/errors are bounded.

Screenshots and video can still contain application-visible content. Synthetic data and artifact-retention policy remain necessary because structured redaction cannot sanitize pixels.

## Security and supply chain

`security.yml` keeps independent control planes for:

- CodeQL JavaScript/TypeScript SAST;
- npm HIGH/CRITICAL advisory gating over the committed dependency graph;
- Trivy HIGH/CRITICAL dependency/configuration/secret scanning;
- pull-request Dependency Review when GitHub Dependency graph is available.

If Dependency graph is unavailable, the workflow records the limitation while npm Audit and Trivy remain independent gates. Whole-repository scanning is not represented as equivalent to dependency-diff review.

External GitHub Actions are pinned to immutable commit SHAs, and `config/workflowPins.selftest.js` makes that policy executable. The lockfile, lifecycle-script-disabled install, explicit Cypress binary install/verification, npm Audit, CodeQL, Trivy, and Dependency Review cover different supply-chain failure modes.

## Confidence boundaries

| Signal | Confidence gained | Deliberate limit |
| --- | --- | --- |
| Repository-owned fixture | Cypress scheduling, selectors, navigation, state transitions, negative behavior, and artifacts execute against deterministic app behavior | Does not prove deployed routing, TLS, identity providers, production data, or third-party dependencies |
| Primary Chrome gate | Covered critical UI behavior works in the primary qualified browser/runtime combination | Does not imply universal browser/device/viewport/OS/accessibility coverage |
| Firefox compatibility | Covered contracts survive a deliberate engine change while app/runtime policy stay controlled | Evidence is scoped to executed flows, not complete browser equivalence |
| `cy.intercept()` + aliases | Owned dependency conditions and request-driven UI behavior are causally attributable | Stubbed conditions do not prove a live dependency behaves identically |
| `cy.session()` + `validate()` | Cached browser state is reused only after an executable usability check | Does not prove upstream authentication on every restored path |
| `cy.clock()` / `cy.tick()` | Timer-dependent client behavior is deterministic at exact logical boundaries | Does not prove backend expiry, distributed clocks, schedulers, or real latency |
| Retry-recovered-pass rejection | Retry diagnostics can be collected without normalizing instability into clean correctness | Retries do not diagnose root cause |
| Manifest / screenshot / video | Aggregate/per-test outcomes are reconciled and failures retain useful context | Visual artifacts can contain application-visible data |
| CodeQL / npm Audit / Trivy / Dependency Review | Independent controls inspect source, dependency, repository, and change-diff risk | All-green scanners are not proof of vulnerability absence |

Choose synchronization from observable causal state—DOM, network completion, browser state, or controlled time—not elapsed-time guessing.

## Dependency maintenance

Dependabot maintains **npm** and **GitHub Actions**.

- updates run weekly Monday at 09:00 America/New_York;
- grouped minor/patch updates reduce low-risk PR noise;
- majors remain standalone to isolate Cypress/Node/API compatibility changes;
- Actions are reviewed as executable dependencies and immutable-pin policy is enforced;
- automated updates are evaluated by runtime self-tests, primary Chrome coverage, applicable Firefox/runtime compatibility, security, and documentation workflows.

Automation proposes a change; deterministic evidence and release-impact review decide whether it is safe.

## Failure triage

| Signal | First interpretation |
| --- | --- |
| Runtime self-test | Configuration/reporting contract |
| Fixture connection | Repository fixture lifecycle/port ownership |
| `cy.visit()` | Navigation/HTTP/page-load boundary |
| Selector timeout | UI contract/readiness |
| Alias/interception mismatch | Request causality/network contract |
| Session validation failure | Cached state/environment invalidation |
| Clock/timer mismatch | Application timing semantics |
| Node task failure | Plugin-process boundary |
| Invalid-login mismatch | Rejection/error semantics |
| Firefox-only failure | Browser compatibility on the primary runtime |
| Maintenance-LTS/Chrome-only failure | Runtime compatibility |
| Retry-only pass | Reliability defect |
| Evidence floor/count failure | Test discovery, disabled tests, or reporter integrity |
| External-target-only failure | Environment/integration first |
| CodeQL / npm Audit / Trivy / Dependency Review | Independent security-control failure |
| Docs | Documentation/governance contract |

## Explicit anti-patterns

- required CI against a public demonstration website;
- fixed `cy.wait(number)` readiness;
- disabled test isolation to preserve predecessor state;
- cached sessions without validation when validity matters;
- styling/DOM-depth selectors as primary contracts;
- blanket `cy.intercept()` stubbing;
- hidden auth setup when authentication is under test;
- real-time waits for deterministic timer behavior;
- retries used to normalize unexplained flakiness;
- credentials or arbitrary response bodies in generic evidence;
- treating whole-repository vulnerability scanning as equivalent to dependency-diff review;
- multiplying browser/runtime matrices without a specific compatibility risk.

## Related documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime, fixture, runner, page, command/state, evidence, and supply-chain boundaries.
- [`TEST_STRATEGY.md`](TEST_STRATEGY.md) — layer selection, browser/runtime policy, isolation, negative testing, security, and exit criteria.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — change-quality expectations.

A strong Cypress framework makes the failing boundary obvious: runtime configuration, fixture lifecycle, command/network/state orchestration, navigation, browser compatibility, runtime compatibility, selector/readiness, application behavior, security, or explicit environment integration.
