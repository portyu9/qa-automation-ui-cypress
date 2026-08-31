'use strict';

const assert = require('node:assert/strict');
const {
  MIN_EXECUTED_TESTS,
  assertMeaningfulRunManifest,
  assertNoRetryRecoveredPasses,
  retryRecoveredPasses,
} = require('./retryPolicy');

function test(title, state = 'passed', attempts = 1) {
  return { title, state, attempts };
}

const cleanTests = Array.from({ length: MIN_EXECUTED_TESTS }, (_, index) =>
  test(`passes first attempt ${index + 1}`)
);
const clean = {
  totals: {
    tests: MIN_EXECUTED_TESTS,
    passed: MIN_EXECUTED_TESTS,
    failed: 0,
    pending: 0,
    skipped: 0,
  },
  runs: [{ spec: 'cypress/e2e/login.cy.js', tests: cleanTests }],
};
assert.deepEqual(retryRecoveredPasses(clean), []);
assert.doesNotThrow(() => assertMeaningfulRunManifest(clean));
assert.doesNotThrow(() => assertNoRetryRecoveredPasses(clean));

const flaky = structuredClone(clean);
flaky.runs[0].tests[0].attempts = 2;
assert.equal(retryRecoveredPasses(flaky).length, 1);
assert.throws(() => assertNoRetryRecoveredPasses(flaky), /retry-recovered pass detected/);

const terminalFailure = structuredClone(clean);
terminalFailure.totals.passed -= 1;
terminalFailure.totals.failed = 1;
terminalFailure.runs[0].tests[0] = test('still fails', 'failed', 3);
assert.deepEqual(retryRecoveredPasses(terminalFailure), []);
assert.throws(() => assertMeaningfulRunManifest(terminalFailure), /not a clean executed run/);

const tooSmall = {
  totals: { tests: 1, passed: 1, failed: 0, pending: 0, skipped: 0 },
  runs: [{ spec: 'cypress/e2e/login.cy.js', tests: [test('single test')] }],
};
assert.throws(() => assertMeaningfulRunManifest(tooSmall), /executed-test floor not met/);

const pending = structuredClone(clean);
pending.totals.passed -= 1;
pending.totals.pending = 1;
pending.runs[0].tests[0] = test('disabled test', 'pending', 0);
assert.throws(() => assertMeaningfulRunManifest(pending), /executed-test floor not met/);

assert.throws(
  () =>
    assertMeaningfulRunManifest({
      totals: { tests: 0, passed: 0, failed: 0, pending: 0, skipped: 0 },
      runs: [],
    }),
  /zero discovered tests/
);
assert.throws(
  () =>
    assertMeaningfulRunManifest({
      ...clean,
      totals: { ...clean.totals, tests: MIN_EXECUTED_TESTS + 1 },
    }),
  /total mismatch/
);
assert.throws(
  () =>
    assertMeaningfulRunManifest({
      ...clean,
      totals: { ...clean.totals, skipped: 1 },
    }),
  /count mismatch/
);

console.log('Cypress evidence/retry policy contract: ok');
