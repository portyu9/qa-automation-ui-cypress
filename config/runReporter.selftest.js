'use strict';

const assert = require('node:assert/strict');
const { buildRunManifest } = require('./runReporter');

const manifest = buildRunManifest(
  {
    browserName: 'chrome',
    browserVersion: '140',
    osName: 'linux',
    osVersion: 'test',
    cypressVersion: '15.21.1',
    totalTests: 2,
    totalPassed: 1,
    totalFailed: 1,
    totalPending: 0,
    totalSkipped: 0,
    totalDuration: 1234,
    runs: [
      {
        spec: { relative: 'cypress/e2e/login.cy.js' },
        stats: { tests: 2, failures: 1 },
        tests: [
          { title: ['login', 'passes'], state: 'passed', attempts: [{ state: 'passed' }] },
          {
            title: ['login', 'fails'],
            state: 'failed',
            attempts: [{ state: 'failed', error: { message: 'expected failure' } }],
          },
        ],
      },
    ],
  },
  { runId: 'run-123', baseUrl: 'https://example.test' }
);

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.runId, 'run-123');
assert.deepEqual(manifest.totals, {
  tests: 2,
  passed: 1,
  failed: 1,
  pending: 0,
  skipped: 0,
  durationMs: 1234,
});
assert.equal(manifest.runs[0].tests[1].error, 'expected failure');
console.log('run reporter contract: ok');
