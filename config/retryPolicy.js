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

function assertNoRetryRecoveredPasses(manifest) {
  const flaky = retryRecoveredPasses(manifest);
  if (flaky.length === 0) return;

  const summary = flaky
    .map(({ spec, title, attempts }) => `${spec} :: ${title} (${attempts} attempts)`)
    .join('\n');
  throw new Error(`Cypress retry-recovered pass detected; CI treats flake as failure:\n${summary}`);
}

function readManifest(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.runs)) {
    throw new Error('Cypress run manifest must contain a runs array');
  }
  return parsed;
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('usage: node config/retryPolicy.js <run-manifest.json>');
  assertNoRetryRecoveredPasses(readManifest(filePath));
  console.log('Cypress retry policy: no retry-recovered passes');
}

module.exports = { assertNoRetryRecoveredPasses, retryRecoveredPasses };
