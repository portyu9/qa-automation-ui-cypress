import './commands';

beforeEach(() => {
  cy.task('log', `starting: ${Cypress.currentTest.titlePath.join(' > ')}`, { log: false });
});

afterEach(function () {
  if (this.currentTest?.state === 'failed') {
    const runId = Cypress.expose('runId');
    cy.task(
      'log',
      `failed: ${Cypress.currentTest.titlePath.join(' > ')} | runId=${runId}`,
      { log: false }
    );
  }
});
