'use strict';

const assert = require('node:assert/strict');
const { assertNoRetryRecoveredPasses, retryRecoveredPasses } = require('./retryPolicy');

const clean = {
  runs: [{ spec: 'cypress/e2e/login.cy.js', tests: [{ title: 'passes first attempt', state: 'passed', attempts: 1 }] }],
};
assert.deepEqual(retryRecoveredPasses(clean), []);
assert.doesNotThrow(() => assertNoRetryRecoveredPasses(clean));

const flaky = {
  runs: [{ spec: 'cypress/e2e/login.cy.js', tests: [{ title: 'passes after retry', state: 'passed', attempts: 2 }] }],
};
assert.equal(retryRecoveredPasses(flaky).length, 1);
assert.throws(
  () => assertNoRetryRecoveredPasses(flaky),
  /retry-recovered pass detected/
);

const terminalFailure = {
  runs: [{ spec: 'cypress/e2e/login.cy.js', tests: [{ title: 'still fails', state: 'failed', attempts: 3 }] }],
};
assert.deepEqual(retryRecoveredPasses(terminalFailure), []);

console.log('Cypress retry policy contract: ok');
