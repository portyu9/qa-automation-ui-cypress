'use strict';

const fs = require('node:fs');

const MIN_EXECUTED_TESTS = 5;
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

function assertMeaningfulRunManifest(manifest) {
  const runs = Array.isArray(manifest?.runs) ? manifest.runs : [];
  const tests = runs.flatMap((run) => (Array.isArray(run?.tests) ? run.tests : []));
  const totalTests = integerCount(manifest?.totals?.tests, 'totals.tests');
  const passed = integerCount(manifest?.totals?.passed, 'totals.passed');
  const failed = integerCount(manifest?.totals?.failed, 'totals.failed');
  const pending = integerCount(manifest?.totals?.pending, 'totals.pending');
  const skipped = integerCount(manifest?.totals?.skipped, 'totals.skipped');
  const executed = passed + failed;

  if (runs.length === 0 || tests.length === 0 || totalTests === 0) {
    throw new Error('Cypress run manifest contains zero discovered tests');
  }
  if (totalTests !== tests.length) {
    throw new Error(
      `Cypress run manifest total mismatch: totals.tests=${totalTests}, projectedTests=${tests.length}`
    );
  }
  if (totalTests !== passed + failed + pending + skipped) {
    throw new Error(
      `Cypress run manifest count mismatch: total=${totalTests}, passed=${passed}, failed=${failed}, pending=${pending}, skipped=${skipped}`
    );
  }

  const projected = { passed: 0, failed: 0, pending: 0, skipped: 0 };
  for (const test of tests) {
    const state = String(test?.state ?? '');
    if (!TERMINAL_STATES.has(state)) {
      throw new Error(`Cypress run manifest contains unsupported test state: ${state || '<empty>'}`);
    }
    projected[state] += 1;
  }
  for (const state of Object.keys(projected)) {
    if (projected[state] !== { passed, failed, pending, skipped }[state]) {
      throw new Error(
        `Cypress run manifest ${state} mismatch: totals=${{ passed, failed, pending, skipped }[state]}, projected=${projected[state]}`
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
  assertMeaningfulRunManifest(manifest);
  assertNoRetryRecoveredPasses(manifest);
  const executed = Number(manifest.totals.passed) + Number(manifest.totals.failed);
  console.log(
    `Cypress evidence policy: executed=${executed}, passed=${manifest.totals.passed}, pending=0, skipped=0, no retry-recovered passes`
  );
}

module.exports = {
  MIN_EXECUTED_TESTS,
  assertMeaningfulRunManifest,
  assertNoRetryRecoveredPasses,
  retryRecoveredPasses,
};
