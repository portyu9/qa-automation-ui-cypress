'use strict';

const assert = require('node:assert/strict');
const { loadRuntime } = require('./runtime');

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
  const defaults = loadRuntime();
  assert.equal(defaults.baseUrl, 'https://www.saucedemo.com');
  assert.ok(defaults.commandTimeout > 0);

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

  console.log('runtime configuration contract: ok');
} finally {
  process.env = original;
}
