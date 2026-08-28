# Architecture

## Cypress boundary

Cypress already provides command retryability, isolation, network interception, screenshots, and browser lifecycle. Framework code should configure those capabilities rather than reproduce them in generic wrappers.

- **Specs** contain behavior and assertions.
- **Page objects/components** own stable selectors and domain interactions.
- **Custom commands** are reserved for cross-cutting application intent used broadly across specs.
- **Node tasks** perform operations that legitimately belong outside the browser process.
- **Runtime configuration** validates environment values before Cypress starts.

## Commands

A custom command should earn its global scope. `login`, `visitApp`, and `getByTestId` are small and predictable. Feature-specific behavior generally belongs in a page/component object to avoid turning `cy` into an unbounded utility namespace.

Sensitive values use `{ log: false }` when typed. This reduces accidental credential exposure in the command log, but secrets should still come from environment/secret management rather than fixture files.

## Synchronization

Cypress commands and assertions retry until their timeout. Prefer `.should(...)`, aliases, and `cy.intercept()`/`cy.wait('@alias')` for observable state. Fixed `cy.wait(milliseconds)` is not a synchronization strategy.

## Network behavior

Intercepts may observe real traffic or stub deliberate boundaries. When stubbing, assert request method/path/body semantics so a stub cannot hide client contract drift. Do not mock the critical integration path in every test.

## State isolation

`testIsolation` remains enabled. Tests should not depend on local/session storage left by previous tests. Use `cy.session()` only for setup that has an explicit validation function and is safe to restore across tests.

## Node tasks

Use `cy.task()` for filesystem, database, or other Node-side operations that cannot run in the browser. Tasks should have narrow contracts, deterministic return values, and safe logging. Shell execution is not a general test abstraction.
