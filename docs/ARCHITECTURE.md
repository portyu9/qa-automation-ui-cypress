# Architecture

## Design objective

The framework keeps browser behavior native to Cypress while centralizing cross-cutting execution policy: validated runtime configuration, deterministic target ownership, feature page modules, explicit command/state contracts, test isolation, bounded retries, privacy-aware run reporting, immutable workflow dependencies, and independently attributable security signals.

```mermaid
flowchart LR
    CFG[config/runtime.js] --> CC[cypress.config.js]
    CC --> CY[Cypress runner]
    CC -->|default target| FX[fixture/server.js]
    CY --> SPEC[E2E specs]
    SPEC --> PAGE[Feature pages]
    SPEC --> CMD[Custom commands]
    CMD --> INT[cy.intercept / aliases]
    SPEC --> SESSION[cy.session / validate]
    SPEC --> CLOCK[cy.clock / cy.tick]
    CY --> FX
    CC --> RUN[after:run]
    RUN --> REP[runReporter]
    REP --> MAN[run-manifest.json]
    MAN --> EV[evidence policy]
    EV --> GATE[CI / compatibility gates]
```

The repository fixture exists to make framework validation independent of public-network availability. It is not a second general-purpose application framework.

## Runtime configuration boundary

`config/runtime.js` validates `CYPRESS_BASE_URL`, timeout budgets, and run correlation before Cypress starts browser work. URLs must be absolute HTTP(S), contain a hostname, reject explicit port `0`, and contain no credentials, query, or fragment.

Operator-provided `TEST_RUN_ID` values are trimmed and constrained to 1–128 ASCII letters, digits, dots, underscores, colons, or hyphens. Unsafe whitespace/control characters and overlong tokens fail before they can become report/evidence identity.

The default base URL is `http://127.0.0.1:3100`. A different value explicitly selects a deployed target.

## Fixture lifecycle boundary

`fixture/server.js` owns a deterministic authentication/inventory application using Node's built-in HTTP server. `setupNodeEvents` starts it only when the configured base URL equals the default fixture URL. `after:run` closes it after writing the run manifest.

This produces three distinct execution modes:

1. repository fixture — required deterministic framework/browser contract;
2. `cy.intercept()` — targeted controlled dependency behavior;
3. explicit deployed base URL — environment/integration contract.

Do not blur these modes. A public environment outage is not a Cypress framework regression.

## Cypress execution model

Cypress command retryability, assertions, navigation behavior, screenshots/video, and test isolation remain native. The framework does not wrap ordinary Cypress commands with another asynchronous abstraction.

Custom commands return their terminal Cypress chain so composition remains explicit to callers. `stubJson()` validates a non-empty alias without the `@` prefix and returns the native `cy.intercept(...).as(...)` chain rather than hiding command-queue ownership.

`testIsolation: true` is mandatory. Run-mode retries are capped and remain a reliability diagnostic signal.

## Native command and state contracts

`cypress/e2e/capabilities.cy.js` exercises stateful Cypress features against the repository fixture:

- `cy.intercept()` through the narrow `cy.stubJson()` helper;
- alias ownership and `cy.wait('@alias')` inspection;
- retryable DOM assertions after intercepted network behavior;
- `cy.task()` for an allowlisted Node-side operation;
- `cy.session()` with an explicit `validate()` request so cached browser state is never trusted without a health contract;
- `cy.request()` below the browser when an HTTP health assertion is sufficient;
- `cy.clock()`/`cy.tick()` for deterministic timer behavior instead of elapsed wall-clock sleeps.

Session state, intercept aliases, and clock ownership belong to the test/suite that creates them. They are capabilities, not reasons to create a second framework abstraction.

## Cross-origin policy

The committed fixture is intentionally single-origin. Add a deterministic second-origin fixture and `cy.origin()` only when the application has a real cross-origin requirement such as federated identity, payment handoff, or another separately owned origin.

Cross-origin behavior should not be simulated by weakening browser security policy or by adding an external public dependency to required CI.

## Selector and page model

Stable `data-test` hooks are the primary application test interface. Page modules expose feature intent and locator ownership. Avoid generic `click(selector)` or `type(selector)` wrappers that erase Cypress command context.

Authentication password entry suppresses command logging. Shared diagnostics must not contain credentials, cookies, or arbitrary response bodies.

## Node event boundary

Node events own privileged process/filesystem responsibilities:

- local fixture lifecycle;
- allowlisted logging task;
- run-manifest serialization.

Browser-side spec code should not own CI artifact writing or process lifecycle.

## Run reporter and evidence boundary

`config/runReporter.js` does **not** serialize Cypress's broad `after:run` object. It constructs a deliberate allowlisted manifest schema containing only:

- run identity and sanitized base URL;
- bounded browser/OS/Cypress runtime labels;
- normalized finite non-negative top-level totals;
- bounded/redacted spec labels;
- an allowlisted per-spec stats envelope (`suites`, `tests`, `passes`, `pending`, `skipped`, `failures`, duration);
- bounded/redacted test title/state, attempt count, and final error text.

Unknown or newly introduced properties on Cypress result objects are therefore ignored unless deliberately reviewed and added to the evidence contract. Numeric fields that are non-finite or negative normalize to `null` (or zero at required top-level totals) instead of leaking implementation-specific values into retained evidence.

The manifest is written atomically. `config/retryPolicy.js` then treats the manifest as evidence that must prove the intended work occurred: aggregate totals must reconcile with projected per-test terminal states, at least five tests must actually execute, pending/skipped tests are not accepted in the required lane, failures cannot be represented as a clean run, and retry-recovered passes remain reliability failures.

This distinction matters: a process can exit successfully while discovery or reporting has silently shrunk. Evidence validation is therefore a separate contract from Cypress's own exit code.

## Diagnostic privacy

Structured evidence is sanitized before persistence. URLs lose credentials/query/fragment, common credential assignments are redacted, and labels/error text are bounded. The allowlist prevents arbitrary third-party result-object properties from being persisted by accident. Native screenshots/video can still contain application-visible content; controlled synthetic data remains required.

## Parallelism and port ownership

The fixture uses loopback port `3100`. One Cypress process owns that fixture for its run. CI browser matrix cells run on independent runners, so they do not compete for the port.

If parallel Cypress processes are intentionally run on the same host, each must use an explicitly isolated target/port rather than silently sharing mutable fixture state.

## Runtime and browser qualification

The primary lane uses **Node + Chrome**, representing the current-LTS execution contract. Extended coverage deliberately changes one dimension at a time:

- **Node + Firefox** changes browser engine while holding runtime constant;
- **Node + Chrome** changes runtime generation while holding the primary browser constant.

This is more diagnostic than a small accidental matrix in which both browser and Node version change together. Additional combinations belong only when a known compatibility interaction or release criterion justifies them.

npm is installed and asserted exactly before dependency work in required Node lanes. The dependency graph is installed with lifecycle scripts disabled; Cypress's binary installation is then invoked explicitly as a reviewed side effect.

## Workflow and supply-chain boundary

Workflow dependencies are code. All external GitHub Actions are pinned to full immutable commit SHAs, and `config/workflowPins.selftest.js` scans every workflow so a future edit cannot silently replace that invariant with a mutable tag.

Security remains independently attributable:

- CodeQL evaluates JavaScript/TypeScript source behavior;
- npm Audit evaluates known advisories in the npm dependency graph;
- Trivy evaluates repository dependency/configuration/secret findings;
- Dependency Review evaluates PR dependency deltas when GitHub Dependency graph is available.

These controls overlap by design but are not substitutes. The stable aggregate workflow conclusions are `ci / ci-gate`, `extended / extended-gate`, and `security / security-gate`.

## CI evidence boundary

Primary CI validates configuration/reporter/evidence/workflow-pin policy, verifies the Cypress binary, executes Chrome against the repository fixture, validates the run manifest semantically, and retains bounded evidence. Extended CI repeats the governed contract across the isolated browser and maintenance-LTS dimensions.

Each workflow has least-privilege permissions, concurrency cancellation, bounded job time, explicit artifacts, and a stable aggregate conclusion so internal matrix evolution does not constantly change the external status interface.

## Extension rules

New framework behavior should:

1. validate external input before browser startup;
2. preserve native Cypress command/assertion semantics and return command chains from custom commands;
3. keep the default CI target repository-owned and deterministic;
4. use Node events for process/filesystem lifecycle concerns;
5. keep page modules feature-oriented and small;
6. maintain test isolation and explicit session/intercept/clock ownership;
7. construct retained evidence from reviewed allowlists rather than copying third-party result objects;
8. sanitize and bound structured diagnostics before persistence;
9. prove meaningful execution counts and terminal-state reconciliation rather than relying only on process success;
10. add zero-browser tests when config/reporter/policy logic can be separated from the browser;
11. add cross-origin infrastructure only for a real multi-origin requirement;
12. classify deployed-environment tests separately from required framework CI;
13. expand browser/runtime matrices only for attributable compatibility risk.
