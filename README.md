# Cypress UI Test Automation Framework

A Cypress end-to-end framework for browser workflows with page abstractions, stable test selectors, validated runtime settings, isolated tests, bounded retries, and CI failure evidence.

## Framework characteristics

- Cypress 15.21.x;
- `data-test` selector contract;
- page objects for feature-specific interactions;
- small global custom-command surface;
- environment validation before the test runner starts;
- Cypress-native command retryability instead of fixed sleeps;
- Node tasks for non-browser operations and correlated diagnostics;
- run-mode retry policy with screenshots on failure;
- dependency and GitHub Actions update automation.

## Structure

```text
.
├── config/runtime.js
├── cypress/
│   ├── e2e/
│   ├── fixtures/
│   ├── pages/
│   └── support/
├── cypress.config.js
├── docs/
└── .github/workflows/ci.yml
```

## Prerequisites

Cypress 15 requires a modern Node runtime; this project requires Node 22+.

```bash
npm install
npm run cypress:verify
```

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `CYPRESS_BASE_URL` | application URL | `https://www.saucedemo.com` |
| `CYPRESS_COMMAND_TIMEOUT_MS` | retry budget for Cypress commands | `10000` |
| `CYPRESS_REQUEST_TIMEOUT_MS` | request connection timeout | `10000` |
| `CYPRESS_RESPONSE_TIMEOUT_MS` | server response timeout | `30000` |
| `CYPRESS_PAGE_LOAD_TIMEOUT_MS` | navigation timeout | `60000` |
| `TEST_RUN_ID` | diagnostic correlation identifier | local timestamp / CI run ID |

`.env.example` documents non-secret values; Cypress does not automatically load it. Inject configuration through the shell or CI environment.

## Commands

```bash
npm test               # headless Cypress run
npm run test:chrome    # Chrome CI-equivalent gate
npm run test:electron  # Electron run
npm run test:login     # focused login spec
npm run cypress:open   # interactive runner
npm run config:check   # validate Node-side configuration
```

## Test design

### Selectors

Use stable `data-test` attributes through `cy.getByTestId()`. Avoid generated classes, DOM ancestry, and style-dependent selectors.

### Synchronization

Do not use fixed waits to make a test pass. Cypress commands and `.should()` assertions retry automatically. For network-driven transitions:

```js
cy.intercept('POST', '/api/orders').as('createOrder');
// perform action
cy.wait('@createOrder').its('response.statusCode').should('eq', 201);
cy.getByTestId('order-status').should('contain.text', 'Created');
```

### Custom commands

Global commands are intentionally limited. Feature-specific operations should stay in page/component objects. Sensitive values are typed with command logging disabled.

### Sessions and state

Test isolation remains enabled. Use `cy.session()` only when cached setup is materially faster, has an explicit validation check, and does not create cross-test state coupling.

### Network stubbing

Use `cy.intercept()` deliberately. A stub should validate the outbound request contract, and critical end-to-end tests should retain at least one real integration path.

## CI

GitHub Actions runs Node 22, validates configuration, verifies the Cypress binary, executes Chrome, and uploads failure artifacts with bounded retention. The workflow cancels superseded runs on the same branch to avoid wasting browser capacity.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md) for framework boundaries and reliability policy.
