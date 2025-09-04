const { defineConfig } = require('cypress');

/**
 * Cypress configuration for the UI test project.
 *
 * The baseUrl points at the Sauce Demo site by default.  You can override
 * this via environment variables or by editing this file.  Test files live
 * under cypress/e2e and follow the *.cy.js naming convention.
 */
module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://www.saucedemo.com',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // implement node event listeners here if needed
    }
  }
});
