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

function run(spec, tests) {
  const counts = { passed: 0, failed: 0, pending: 0, skipped: 0 };
  for (const item of tests) counts[item.state] += 1;
  return {
    spec,
    stats: {
      suites: 1,
      tests: tests.length,
      passes: counts.passed,
      failures: counts.failed,
      pending: counts.pending,
      skipped: counts.skipped,
      durationMs: 100,
    },
    tests,
  };
}

const capabilityTests = [
  test('coordinates intercept aliases'),
  test('restores session state'),
  test('controls application timers'),
];
const loginTests = [test('logs in'), test('rejects invalid credentials')];
const clean = {
  schemaVersion: 1,
  runId: 'gha-123-1',
  baseUrl: 'http://127.0.0.1:3100',
  browser: { name: 'chrome', version: '151.0.0.0' },
  platform: { name: 'linux', version: 'Ubuntu' },
  cypressVersion: '15.21.1',
  totals: {
    tests: MIN_EXECUTED_TESTS,
    passed: MIN_EXECUTED_TESTS,
    failed: 0,
    pending: 0,
    skipped: 0,
  },
  runs: [
    run('cypress/e2e/capabilities.cy.js', capabilityTests),
    run('cypress/e2e/login.cy.js', loginTests),
  ],
};
const expected = {
  runId: 'gha-123-1',
  baseUrl: 'http://127.0.0.1:3100',
  browser: 'chrome',
};

assert.deepEqual(retryRecoveredPasses(clean), []);
assert.doesNotThrow(() => assertMeaningfulRunManifest(clean, expected));
assert.doesNotThrow(() => assertNoRetryRecoveredPasses(clean));

const flaky = structuredClone(clean);
flaky.runs[0].tests[0].attempts = 2;
assert.equal(retryRecoveredPasses(flaky).length, 1);
assert.throws(() => assertNoRetryRecoveredPasses(flaky), /retry-recovered pass detected/);

const terminalFailure = structuredClone(clean);
terminalFailure.totals.passed -= 1;
terminalFailure.totals.failed = 1;
terminalFailure.runs[0].tests[0] = test('still fails', 'failed', 3);
terminalFailure.runs[0].stats.passes -= 1;
terminalFailure.runs[0].stats.failures = 1;
assert.deepEqual(retryRecoveredPasses(terminalFailure), []);
assert.throws(
  () => assertMeaningfulRunManifest(terminalFailure, expected),
  /not a clean executed run/
);

const tooSmall = structuredClone(clean);
tooSmall.runs[0].tests = [test('single test')];
tooSmall.runs[0].stats.tests = 1;
tooSmall.runs[0].stats.passes = 1;
tooSmall.runs[1].tests = [];
tooSmall.runs[1].stats.tests = 0;
tooSmall.runs[1].stats.passes = 0;
tooSmall.totals.tests = 1;
tooSmall.totals.passed = 1;
assert.throws(() => assertMeaningfulRunManifest(tooSmall, expected), /executed-test floor not met/);

const pending = structuredClone(clean);
pending.totals.passed -= 1;
pending.totals.pending = 1;
pending.runs[0].tests[0] = test('disabled test', 'pending', 0);
pending.runs[0].stats.passes -= 1;
pending.runs[0].stats.pending = 1;
assert.throws(() => assertMeaningfulRunManifest(pending, expected), /executed-test floor not met/);

const wrongBrowser = structuredClone(clean);
wrongBrowser.browser.name = 'firefox';
assert.throws(
  () => assertMeaningfulRunManifest(wrongBrowser, expected),
  /browser mismatch/
);

const wrongRun = structuredClone(clean);
wrongRun.runId = 'gha-other-1';
assert.throws(() => assertMeaningfulRunManifest(wrongRun, expected), /runId mismatch/);

const missingSpec = structuredClone(clean);
missingSpec.runs[0].spec = 'cypress/e2e/other.cy.js';
assert.throws(() => assertMeaningfulRunManifest(missingSpec, expected), /required spec evidence is missing/);

const duplicateSpec = structuredClone(clean);
duplicateSpec.runs[1].spec = duplicateSpec.runs[0].spec;
assert.throws(() => assertMeaningfulRunManifest(duplicateSpec, expected), /duplicate spec evidence/);

const badRunStats = structuredClone(clean);
badRunStats.runs[0].stats.tests += 1;
assert.throws(() => assertMeaningfulRunManifest(badRunStats, expected), /spec test-count mismatch/);

assert.throws(
  () =>
    assertMeaningfulRunManifest(
      {
        ...clean,
        totals: { ...clean.totals, tests: MIN_EXECUTED_TESTS + 1 },
      },
      expected
    ),
  /aggregate tests mismatch/
);

console.log('Cypress evidence/retry policy contract: ok');
