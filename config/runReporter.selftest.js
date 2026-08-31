'use strict';

const assert = require('node:assert/strict');
const { buildRunManifest, compactTaskLog, sanitizeUrl } = require('./runReporter');

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
        stats: {
          suites: 1,
          tests: 2,
          passes: 1,
          pending: 0,
          skipped: 0,
          failures: 1,
          wallClockDuration: 1234,
          internalObjectThatMustNotPersist: { token: 'secret' },
        },
        tests: [
          { title: ['login', 'passes'], state: 'passed', attempts: [{ state: 'passed' }] },
          {
            title: ['login', 'password=secret', 'x'.repeat(600)],
            state: 'failed',
            attempts: [
              {
                state: 'failed',
                error: {
                  message:
                    'Authorization=Bearer abc123 at https://example.test/login?token=secret ' +
                    'data:text/html,<h1>private-payload</h1> ' +
                    'javascript:alert("dialog-secret") ' +
                    'file:///tmp/private-report.html',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    runId: 'run-123',
    baseUrl: 'https://user:password@example.test/app?access_token=secret#fragment',
  }
);

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.runId, 'run-123');
assert.equal(manifest.baseUrl, 'https://example.test/app');
assert.equal(sanitizeUrl('https://user:secret@%zz.invalid/path'), '<invalid-url>');
assert.equal(sanitizeUrl('about:blank'), 'about:blank');
assert.equal(sanitizeUrl('data:text/html,<h1>private</h1>'), 'data:<redacted>');
assert.equal(sanitizeUrl('file:///tmp/private-report.html'), 'file:<redacted>');
assert.deepEqual(manifest.totals, {
  tests: 2,
  passed: 1,
  failed: 1,
  pending: 0,
  skipped: 0,
  durationMs: 1234,
});
assert.deepEqual(manifest.runs[0].stats, {
  suites: 1,
  tests: 2,
  passes: 1,
  pending: 0,
  skipped: 0,
  failures: 1,
  durationMs: 1234,
});
assert.equal('internalObjectThatMustNotPersist' in manifest.runs[0].stats, false);
assert.equal(manifest.runs[0].tests[1].title.includes('secret'), false);
assert.ok(manifest.runs[0].tests[1].title.length <= 512);
assert.equal(manifest.runs[0].tests[1].error.includes('abc123'), false);
assert.equal(manifest.runs[0].tests[1].error.includes('?token=secret'), false);
assert.equal(manifest.runs[0].tests[1].error.includes('private-payload'), false);
assert.equal(manifest.runs[0].tests[1].error.includes('dialog-secret'), false);
assert.equal(manifest.runs[0].tests[1].error.includes('private-report.html'), false);
assert.equal(manifest.runs[0].tests[1].error.includes('data:<redacted>'), true);
assert.equal(manifest.runs[0].tests[1].error.includes('javascript:<redacted>'), true);
assert.equal(manifest.runs[0].tests[1].error.includes('file:<redacted>'), true);

const taskLog = compactTaskLog(
  'Authorization=Bearer task-secret https://example.test/path?token=private ' + 'x'.repeat(600)
);
assert.equal(taskLog.includes('task-secret'), false);
assert.equal(taskLog.includes('?token=private'), false);
assert.equal(taskLog.includes('Authorization=<redacted>'), true);
assert.ok(taskLog.length <= 512);
assert.equal(taskLog.endsWith('…<truncated>'), true);

console.log('run reporter contract: ok');
