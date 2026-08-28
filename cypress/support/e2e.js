import './commands';

beforeEach(() => {
  cy.task('log', `starting: ${Cypress.currentTest.titlePath.join(' > ')}`, { log: false });
});

afterEach(function () {
  if (this.currentTest?.state === 'failed') {
    cy.task(
      'log',
      `failed: ${Cypress.currentTest.titlePath.join(' > ')} | runId=${Cypress.env('runId')}`,
      { log: false }
    );
  }
});
