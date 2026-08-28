'use strict';

const assert = require('node:assert/strict');

process.env.TEST_RUN_ID = 'config-contract-run';
const config = require('../cypress.config');

assert.equal(config.allowCypressEnv, false, 'legacy Cypress.env() must remain disabled');
assert.equal(config.expose?.runId, 'config-contract-run', 'run ID must be exposed as public correlation metadata');
assert.equal(config.env?.runId, undefined, 'run ID must not be hydrated through legacy Cypress env');

console.log('cypress public configuration contract: ok');
