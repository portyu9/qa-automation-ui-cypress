const { defineConfig } = require('cypress');
const { loadRuntime } = require('./config/runtime');

const runtime = loadRuntime();

module.exports = defineConfig({
  viewportWidth: 1440,
  viewportHeight: 1000,
  defaultCommandTimeout: runtime.commandTimeout,
  requestTimeout: runtime.requestTimeout,
  responseTimeout: runtime.responseTimeout,
  pageLoadTimeout: runtime.pageLoadTimeout,
  screenshotOnRunFailure: true,
  trashAssetsBeforeRuns: true,
  retries: {
    runMode: 2,
    openMode: 0,
  },
  e2e: {
    baseUrl: runtime.baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    testIsolation: true,
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log(`[cypress:${runtime.runId}] ${String(message)}`);
          return null;
        },
      });

      config.env.runId = runtime.runId;
      return config;
    },
  },
});
