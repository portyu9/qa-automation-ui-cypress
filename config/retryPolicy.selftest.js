'use strict';

const assert = require('node:assert/strict');
const {
  assertMeaningfulRunManifest,
  assertNoRetryRecoveredPasses,
  retryRecoveredPasses,
} = require('./retryPolicy');

const clean = {
  totals: { tests: 1, passed: 1, failed: 0 },
  runs: [{ spec: 'cypress/e2e/login.cy.js', tests: [{ title: 'passes first attempt', state: 'passed', attempts: 1 }] }],
};
assert.deepEqual(retryRecoveredPasses(clean), []);
assert.doesNotThrow(() => assertMeaningfulRunManifest(clean));
assert.doesNotThrow(() => assertNoRetryRecoveredPasses(clean));

const flaky = {
  totals: { tests: 1, passed: 1, failed: 0 },
  runs: [{ spec: 'cypress/e2e/login.cy.js', tests: [{ title: 'passes after retry', state: 'passed', attempts: 2 }] }],
};
assert.equal(retryRecoveredPasses(flaky).length, 1);
assert.throws(() => assertNoRetryRecoveredPasses(flaky), /retry-recovered pass detected/);

const terminalFailure = {
  totals: { tests: 1, passed: 0, failed: 1 },
  runs: [{ spec: 'cypress/e2e/login.cy.js', tests: [{ title: 'still fails', state: 'failed', attempts: 3 }] }],
};
assert.deepEqual(retryRecoveredPasses(terminalFailure), []);
assert.throws(() => assertMeaningfulRunManifest(terminalFailure), /not a clean executed run/);

assert.throws(
  () => assertMeaningfulRunManifest({ totals: { tests: 0, passed: 0, failed: 0 }, runs: [] }),
  /zero executed tests/
);
assert.throws(
  () => assertMeaningfulRunManifest({ ...clean, totals: { tests: 2, passed: 1, failed: 0 } }),
  /total mismatch/
);

console.log('Cypress evidence/retry policy contract: ok');
