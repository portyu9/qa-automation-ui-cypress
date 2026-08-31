'use strict';

const fs = require('node:fs');

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

function assertMeaningfulRunManifest(manifest) {
  const runs = Array.isArray(manifest?.runs) ? manifest.runs : [];
  const tests = runs.flatMap((run) => (Array.isArray(run?.tests) ? run.tests : []));
  const totalTests = Number(manifest?.totals?.tests);
  const passed = Number(manifest?.totals?.passed);
  const failed = Number(manifest?.totals?.failed);

  if (runs.length === 0 || tests.length === 0 || !Number.isInteger(totalTests) || totalTests <= 0) {
    throw new Error('Cypress run manifest contains zero executed tests');
  }
  if (totalTests !== tests.length) {
    throw new Error(`Cypress run manifest total mismatch: totals.tests=${totalTests}, projectedTests=${tests.length}`);
  }
  if (!Number.isInteger(passed) || passed <= 0 || failed !== 0) {
    throw new Error(`Cypress run manifest is not a clean executed run: passed=${passed}, failed=${failed}`);
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
  console.log(`Cypress evidence policy: tests=${manifest.totals.tests}, passed=${manifest.totals.passed}, no retry-recovered passes`);
}

module.exports = {
  assertMeaningfulRunManifest,
  assertNoRetryRecoveredPasses,
  retryRecoveredPasses,
};
