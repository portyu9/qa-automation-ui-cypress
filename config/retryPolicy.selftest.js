'use strict';

const assert = require('node:assert/strict');
const {
  MIN_EXECUTED_TESTS,
  assertMeaningfulRunManifest,
  assertNoRetryRecoveredPasses,
  lockedCypressVersion,
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
  test('Cypress capability contracts > coordinates intercept aliases, retryable DOM assertions, and node tasks'),
  test('Cypress capability contracts > restores browser state through cy.session with an explicit validation contract'),
  test('Cypress capability contracts > controls application timers deterministically with cy.clock and cy.tick'),
];
const loginTests = [
  test('authentication flow > logs in with valid credentials'),
  test('authentication flow > shows an error for invalid credentials'),
];
const lockedVersion = lockedCypressVersion();
const clean = {
  schemaVersion: 1,
  runId: 'gha-123-1',
  baseUrl: 'http://127.0.0.1:3100',
  browser: { name: 'chrome', version: '151.0.0.0' },
  platform: { name: 'linux', version: 'Ubuntu' },
  cypressVersion: lockedVersion,
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
  cypressVersion: lockedVersion,
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
terminalFailure.runs[0].tests[0] = test(
  'Cypress capability contracts > coordinates intercept aliases, retryable DOM assertions, and node tasks',
  'failed',
  3
);
terminalFailure.runs[0].stats.passes -= 1;
terminalFailure.runs[0].stats.failures = 1;
assert.deepEqual(retryRecoveredPasses(terminalFailure), []);
assert.throws(
  () => assertMeaningfulRunManifest(terminalFailure, expected),
  /not a clean executed run/
);

const tooSmall = structuredClone(clean);
tooSmall.runs[0].tests = [capabilityTests[0]];
tooSmall.runs[0].stats.tests = 1;
tooSmall.runs[0].stats.passes = 1;
tooSmall.runs[1].tests = [];
tooSmall.runs[1].stats.tests = 0;
tooSmall.runs[1].stats.passes = 0;
tooSmall.totals.tests = 1;
tooSmall.totals.passed = 1;
assert.throws(
  () => assertMeaningfulRunManifest(tooSmall, expected),
  /governed behavior evidence is missing/
);

const pending = structuredClone(clean);
pending.totals.passed -= 1;
pending.totals.pending = 1;
pending.runs[0].tests[0] = test(capabilityTests[0].title, 'pending', 0);
pending.runs[0].stats.passes -= 1;
pending.runs[0].stats.pending = 1;
assert.throws(() => assertMeaningfulRunManifest(pending, expected), /executed-test floor not met/);

const wrongBrowser = structuredClone(clean);
wrongBrowser.browser.name = 'firefox';
assert.throws(
  () => assertMeaningfulRunManifest(wrongBrowser, expected),
  /browser mismatch/
);

const wrongVersion = structuredClone(clean);
wrongVersion.cypressVersion = '0.0.0';
assert.throws(
  () => assertMeaningfulRunManifest(wrongVersion, expected),
  /version mismatch/
);

const wrongRun = structuredClone(clean);
wrongRun.runId = 'gha-other-1';
assert.throws(() => assertMeaningfulRunManifest(wrongRun, expected), /runId mismatch/);

const missingSpec = structuredClone(clean);
missingSpec.runs[0].spec = 'cypress/e2e/other.cy.js';
assert.throws(() => assertMeaningfulRunManifest(missingSpec, expected), /required spec evidence is missing/);

const missingBehavior = structuredClone(clean);
missingBehavior.runs[0].tests[0].title = 'Cypress capability contracts > unrelated passing behavior';
assert.throws(
  () => assertMeaningfulRunManifest(missingBehavior, expected),
  /governed behavior evidence is missing/
);

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
