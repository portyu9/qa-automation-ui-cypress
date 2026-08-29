const { defineConfig } = require('cypress');
const { DEFAULT_FIXTURE_URL, loadRuntime } = require('./config/runtime');
const { writeRunManifest } = require('./config/runReporter');
const { startFixtureServer, stopFixtureServer } = require('./fixture/server');

const runtime = loadRuntime();
let fixtureServer;

module.exports = defineConfig({
  viewportWidth: 1440,
  viewportHeight: 1000,
  defaultCommandTimeout: runtime.commandTimeout,
  requestTimeout: runtime.requestTimeout,
  responseTimeout: runtime.responseTimeout,
  pageLoadTimeout: runtime.pageLoadTimeout,
  screenshotOnRunFailure: true,
  trashAssetsBeforeRuns: true,
  allowCypressEnv: false,
  expose: {
    runId: runtime.runId,
  },
  retries: {
    runMode: 2,
    openMode: 0,
  },
  e2e: {
    baseUrl: runtime.baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    testIsolation: true,
    async setupNodeEvents(on, config) {
      if (runtime.baseUrl === DEFAULT_FIXTURE_URL) {
        fixtureServer = await startFixtureServer();
      }

      on('task', {
        log(message) {
          console.log(`[cypress:${runtime.runId}] ${String(message)}`);
          return null;
        },
      });

      on('after:run', async (results) => {
        try {
          writeRunManifest(config.projectRoot, runtime, results);
        } finally {
          await stopFixtureServer(fixtureServer);
        }
      });

      return config;
    },
  },
});
