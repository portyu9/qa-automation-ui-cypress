'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MIN_EXECUTED_TESTS = 5;
const REQUIRED_SPEC_BEHAVIORS = Object.freeze({
  'cypress/e2e/capabilities.cy.js': Object.freeze([
    'coordinates intercept aliases, retryable DOM assertions, and node tasks',
    'restores browser state through cy.session with an explicit validation contract',
    'controls application timers deterministically with cy.clock and cy.tick',
  ]),
  'cypress/e2e/login.cy.js': Object.freeze([
    'logs in with valid credentials',
    'shows an error for invalid credentials',
  ]),
});
const REQUIRED_SPECS = new Set(Object.keys(REQUIRED_SPEC_BEHAVIORS));
const TERMINAL_STATES = new Set(['passed', 'failed', 'pending', 'skipped']);

function retryRecoveredPasses(manifest) {
  const failures = [];
  for (const run of Array.isArray(manifest?.runs) ? manifest.runs : []) {
    for (const test of Array.isArray(run?.tests) ? run.tests : []) {
      if (test?.state === 'passed' && Number(test?.attempts) > 1) {
        failures.push({
          spec: String(run?.spec || 'unknown'),
          title: String(test?.title || 'unknown'),
          attempts: Number(test.attempts),
        });
      }
    }
  }
  return failures;
}

function integerCount(value, label) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Cypress run manifest ${label} must be a non-negative integer: ${value}`);
  }
  return count;
}

function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`Cypress run manifest ${label} must be non-empty`);
  return text;
}

function normalizeBrowser(value) {
  return requiredText(value, 'browser.name').toLowerCase();
}

function leafTitle(value) {
  return requiredText(value, 'test.title').split(' > ').at(-1);
}

function lockedCypressVersion(filePath = path.join(process.cwd(), 'package-lock.json')) {
  const lock = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (lock?.lockfileVersion !== 3 || !lock?.packages || typeof lock.packages !== 'object') {
    throw new Error('package-lock.json must use lockfileVersion 3 with a packages map');
  }
  requiredText(lock.packages['']?.devDependencies?.cypress, 'locked root Cypress declaration');
  return requiredText(lock.packages['node_modules/cypress']?.version, 'locked Cypress version');
}

function assertRunIdentity(manifest, expected = {}) {
  if (manifest?.schemaVersion !== 1) {
    throw new Error(`Cypress run manifest schemaVersion must be 1: ${manifest?.schemaVersion}`);
  }

  const runId = requiredText(manifest?.runId, 'runId');
  const baseUrl = requiredText(manifest?.baseUrl, 'baseUrl');
  const browser = normalizeBrowser(manifest?.browser?.name);
  requiredText(manifest?.browser?.version, 'browser.version');
  requiredText(manifest?.platform?.name, 'platform.name');
  requiredText(manifest?.platform?.version, 'platform.version');
  const cypressVersion = requiredText(manifest?.cypressVersion, 'cypressVersion');

  if (expected.runId && runId !== expected.runId) {
    throw new Error(`Cypress run manifest runId mismatch: expected=${expected.runId}, actual=${runId}`);
  }
  if (expected.baseUrl && baseUrl !== expected.baseUrl) {
    throw new Error(
      `Cypress run manifest baseUrl mismatch: expected=${expected.baseUrl}, actual=${baseUrl}`
    );
  }
  if (expected.browser && browser !== String(expected.browser).toLowerCase()) {
    throw new Error(
      `Cypress run manifest browser mismatch: expected=${expected.browser}, actual=${browser}`
    );
  }
  if (expected.cypressVersion && cypressVersion !== String(expected.cypressVersion)) {
    throw new Error(
      `Cypress run manifest version mismatch: expected=${expected.cypressVersion}, actual=${cypressVersion}`
    );
  }
}

function assertGovernedBehaviors(runsBySpec) {
  for (const [spec, requiredBehaviors] of Object.entries(REQUIRED_SPEC_BEHAVIORS)) {
    const run = runsBySpec.get(spec);
    if (!run) {
      throw new Error(`Cypress required spec evidence is missing: ${spec}`);
    }
    const observed = new Set((run.tests || []).map((test) => leafTitle(test.title)));
    for (const behavior of requiredBehaviors) {
      if (!observed.has(behavior)) {
        throw new Error(`Cypress governed behavior evidence is missing from ${spec}: ${behavior}`);
      }
    }
  }
}

function assertMeaningfulRunManifest(manifest, expected = {}) {
  assertRunIdentity(manifest, expected);

  const runs = Array.isArray(manifest?.runs) ? manifest.runs : [];
  const totalTests = integerCount(manifest?.totals?.tests, 'totals.tests');
  const passed = integerCount(manifest?.totals?.passed, 'totals.passed');
  const failed = integerCount(manifest?.totals?.failed, 'totals.failed');
  const pending = integerCount(manifest?.totals?.pending, 'totals.pending');
  const skipped = integerCount(manifest?.totals?.skipped, 'totals.skipped');
  const executed = passed + failed;

  if (runs.length === 0 || totalTests === 0) {
    throw new Error('Cypress run manifest contains zero discovered tests');
  }

  const specNames = new Set();
  const runsBySpec = new Map();
  const aggregate = { tests: 0, passed: 0, failed: 0, pending: 0, skipped: 0 };

  for (const run of runs) {
    const spec = requiredText(run?.spec, 'run.spec');
    if (specNames.has(spec)) {
      throw new Error(`Cypress run manifest contains duplicate spec evidence: ${spec}`);
    }
    specNames.add(spec);
    runsBySpec.set(spec, run);

    const tests = Array.isArray(run?.tests) ? run.tests : [];
    const stats = run?.stats ?? {};
    const runCounts = {
      tests: integerCount(stats.tests, `${spec}.stats.tests`),
      passed: integerCount(stats.passes, `${spec}.stats.passes`),
      failed: integerCount(stats.failures, `${spec}.stats.failures`),
      pending: integerCount(stats.pending, `${spec}.stats.pending`),
      skipped: integerCount(stats.skipped, `${spec}.stats.skipped`),
    };

    if (runCounts.tests !== tests.length) {
      throw new Error(
        `Cypress spec test-count mismatch for ${spec}: stats=${runCounts.tests}, projected=${tests.length}`
      );
    }
    if (
      runCounts.tests !==
      runCounts.passed + runCounts.failed + runCounts.pending + runCounts.skipped
    ) {
      throw new Error(`Cypress spec terminal counts do not reconcile for ${spec}`);
    }

    const projected = { passed: 0, failed: 0, pending: 0, skipped: 0 };
    for (const test of tests) {
      requiredText(test?.title, `${spec}.test.title`);
      const state = String(test?.state ?? '');
      if (!TERMINAL_STATES.has(state)) {
        throw new Error(`Cypress run manifest contains unsupported test state: ${state || '<empty>'}`);
      }
      const attempts = integerCount(test?.attempts, `${spec}.test.attempts`);
      if ((state === 'passed' || state === 'failed') && attempts < 1) {
        throw new Error(`Cypress executed test must contain at least one attempt: ${spec}`);
      }
      projected[state] += 1;
    }

    for (const state of Object.keys(projected)) {
      if (projected[state] !== runCounts[state]) {
        throw new Error(
          `Cypress spec ${state} mismatch for ${spec}: stats=${runCounts[state]}, projected=${projected[state]}`
        );
      }
    }

    for (const key of Object.keys(aggregate)) aggregate[key] += runCounts[key];
  }

  for (const requiredSpec of REQUIRED_SPECS) {
    if (!specNames.has(requiredSpec)) {
      throw new Error(`Cypress required spec evidence is missing: ${requiredSpec}`);
    }
  }
  assertGovernedBehaviors(runsBySpec);

  const expectedTotals = { tests: totalTests, passed, failed, pending, skipped };
  for (const key of Object.keys(aggregate)) {
    if (aggregate[key] !== expectedTotals[key]) {
      throw new Error(
        `Cypress aggregate ${key} mismatch: totals=${expectedTotals[key]}, runs=${aggregate[key]}`
      );
    }
  }

  if (executed < MIN_EXECUTED_TESTS) {
    throw new Error(
      `Cypress run manifest executed-test floor not met: executed=${executed}, required=${MIN_EXECUTED_TESTS}`
    );
  }
  if (failed !== 0 || passed !== executed) {
    throw new Error(
      `Cypress run manifest is not a clean executed run: passed=${passed}, failed=${failed}`
    );
  }
  if (pending !== 0 || skipped !== 0) {
    throw new Error(
      `Cypress required run contains disabled tests: pending=${pending}, skipped=${skipped}`
    );
  }
}

function assertNoRetryRecoveredPasses(manifest) {
  const flaky = retryRecoveredPasses(manifest);
  if (flaky.length === 0) return;

  const summary = flaky
    .map(({ spec, title, attempts }) => `${spec} :: ${title} (${attempts} attempts)`)
    .join('\n');
  throw new Error(`Cypress retry-recovered pass detected; CI treats flake as failure:\n${summary}`);
}

function readManifest(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`Cypress run manifest is missing: ${filePath}`);
    }
    throw error;
  }
  if (content.length === 0) throw new Error(`Cypress run manifest is empty: ${filePath}`);

  const parsed = JSON.parse(content);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.runs)) {
    throw new Error('Cypress run manifest must contain a runs array');
  }
  return parsed;
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('usage: node config/retryPolicy.js <run-manifest.json>');
  const manifest = readManifest(filePath);
  assertMeaningfulRunManifest(manifest, {
    runId: process.env.TEST_RUN_ID,
    baseUrl: process.env.CYPRESS_BASE_URL,
    browser: process.env.CYPRESS_EXPECTED_BROWSER,
    cypressVersion: lockedCypressVersion(),
  });
  assertNoRetryRecoveredPasses(manifest);
  const executed = Number(manifest.totals.passed) + Number(manifest.totals.failed);
  console.log(
    `Cypress evidence policy: version=${manifest.cypressVersion}, browser=${manifest.browser.name}, specs=${manifest.runs.length}, executed=${executed}, governedBehaviors=5, passed=${manifest.totals.passed}, pending=0, skipped=0, no retry-recovered passes`
  );
}

module.exports = {
  MIN_EXECUTED_TESTS,
  REQUIRED_SPEC_BEHAVIORS,
  REQUIRED_SPECS,
  assertMeaningfulRunManifest,
  assertNoRetryRecoveredPasses,
  assertRunIdentity,
  lockedCypressVersion,
  retryRecoveredPasses,
};
