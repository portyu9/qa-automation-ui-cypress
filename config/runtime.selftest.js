'use strict';

const assert = require('node:assert/strict');
const { DEFAULT_FIXTURE_URL, loadRuntime } = require('./runtime');

const original = { ...process.env };

function withEnv(name, value, assertion) {
  const previous = process.env[name];
  try {
    process.env[name] = value;
    assertion();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

try {
  delete process.env.CYPRESS_BASE_URL;
  delete process.env.TEST_RUN_ID;
  const defaults = loadRuntime();
  assert.equal(defaults.baseUrl, DEFAULT_FIXTURE_URL);
  assert.ok(defaults.commandTimeout > 0);
  assert.match(defaults.runId, /^local-\d+$/);

  withEnv('CYPRESS_BASE_URL', ' https://example.test/app/ ', () => {
    assert.equal(loadRuntime().baseUrl, 'https://example.test/app');
  });
  withEnv('TEST_RUN_ID', ' cypress:contract-42 ', () => {
    assert.equal(loadRuntime().runId, 'cypress:contract-42');
  });

  for (const value of [
    'localhost:3000',
    'https://user:password@example.test',
    'https://example.test/app?access_token=secret',
    'https://example.test/app#fragment',
  ]) {
    withEnv('CYPRESS_BASE_URL', value, () => {
      assert.throws(() => loadRuntime(), /CYPRESS_BASE_URL/);
    });
  }

  withEnv('CYPRESS_COMMAND_TIMEOUT_MS', '0', () => {
    assert.throws(() => loadRuntime(), /positive integer/);
  });

  for (const value of ['unsafe run id', 'line-break\nheader', 'x'.repeat(129)]) {
    withEnv('TEST_RUN_ID', value, () => {
      assert.throws(() => loadRuntime(), /TEST_RUN_ID/);
    });
  }

  console.log('runtime configuration contract: ok');
} finally {
  process.env = original;
}
