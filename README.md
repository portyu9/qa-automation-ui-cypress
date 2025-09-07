## UI End‑to‑End Testing Framework – Cypress & Page Objects

I built this repository to demonstrate how I approach browser‑based end‑to‑end testing using **Cypress**.  The goal is to create a clean, maintainable framework that scales well as the application grows.  To achieve that, I organize selectors and actions into **Page Object classes** and keep test logic separate from page structure.  This approach helps reduce duplication and makes it clear what each test is exercising with GitHub Actions CI.

### Why Cypress?

Cypress is a modern JavaScript end‑to‑end testing tool that runs directly in the browser.  It provides fast execution, automatic waiting, time‑travel debugging, and an ecosystem of plugins.  Unlike Selenium, there’s no need for WebDriver servers, and the API is fluent and expressive.  I pair Cypress with Page Objects to improve readability and maintainability for larger test suites.

### Project Highlights

* **Page Objects** – classes under `cypress/pages/` encapsulate selectors and common actions for each page.  For example, `LoginPage` exposes methods like `visit()`, `login(username, password)`, and accessors for error messages.  Abstracting these details keeps test files concise and robust.
* **Fixtures and test data** – user credentials are stored in `cypress/fixtures/users.json`.  Tests load this data via `cy.fixture()` so sensitive information is not hard‑coded.
* **Reusable commands** – I define custom commands in `cypress/support/commands.js` to further encapsulate common logic.
* **Real application** – the tests exercise the public [Sauce Demo](https://www.saucedemo.com/) site.  You can change the base URL in `cypress.config.js` to point to another application under test.
* **CI ready** – a GitHub Actions workflow installs dependencies and runs the Cypress tests headlessly on each push.  The configuration can be extended to publish test videos and screenshots as artifacts.

### Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run tests locally**

   To open the interactive Cypress runner:

   ```bash
   npx cypress open
   ```

   For headless execution:

   ```bash
   npx cypress run
   ```

3. **Adjust configuration**

   The default base URL is set to `https://www.saucedemo.com`.  If you want to target a different environment, modify the `baseUrl` property in `cypress.config.js`.

### Project Structure

```
qa-ui-cypress/
├── README.md                      # Project overview
├── package.json                   # NPM dependencies and scripts
├── .gitignore                     # Ignore artifacts
├── cypress.config.js              # Cypress configuration
├── cypress/
│   ├── e2e/
│   │   ├── login.cy.js            # Sample E2E test for login
│   ├── pages/
│   │   ├── LoginPage.js           # Page Object for the login page
│   │   └── InventoryPage.js       # Page Object for the inventory page
│   ├── fixtures/
│   │   └── users.json             # Fixture with valid and invalid users
│   └── support/
│       ├── commands.js            # Custom Cypress commands
│       └── e2e.js                # Support file loaded before tests
└── .github/workflows/ci.yml       # GitHub Actions configuration
```

### Extending This Framework

* Add additional Page Object classes for other parts of the application.
* Use Cypress’ API testing capabilities or integrate with tools like `msw` to stub backend requests.
* Record videos and capture screenshots by configuring the `video` and `screenshotOnRunFailure` settings in `cypress.config.js`.
* Integrate with dashboard services for reporting.

