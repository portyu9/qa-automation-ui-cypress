'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_ERROR_LENGTH = 2_000;
const MAX_LABEL_LENGTH = 500;
const MAX_RUNTIME_LABEL_LENGTH = 200;
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;
const AUTH_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
const SECRET_ASSIGNMENT = /\b(access[_-]?token|token|password|passwd|secret|api[_-]?key|authorization)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;&}]+)/gi;

function sanitizeUrl(value) {
  const raw = String(value ?? '');
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return raw;
  const pathname = parsed.pathname === '/' ? '' : parsed.pathname;
  return `${parsed.origin}${pathname}`;
}

function redactText(value) {
  return String(value ?? '')
    .replace(URL_PATTERN, (url) => sanitizeUrl(url))
    .replace(AUTH_PATTERN, '$1 <redacted>')
    .replace(SECRET_ASSIGNMENT, '$1$2<redacted>');
}

function boundedText(value, maxLength) {
  const text = redactText(value);
  return text.length <= maxLength
    ? text
    : `${text.slice(0, maxLength)}…<truncated>`;
}

function compactError(value) {
  return boundedText(value, MAX_ERROR_LENGTH);
}

function compactLabel(value) {
  return boundedText(value, MAX_LABEL_LENGTH);
}

function finiteNonNegative(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function compactStats(stats = {}) {
  return {
    suites: finiteNonNegative(stats.suites),
    tests: finiteNonNegative(stats.tests),
    passes: finiteNonNegative(stats.passes),
    pending: finiteNonNegative(stats.pending),
    skipped: finiteNonNegative(stats.skipped),
    failures: finiteNonNegative(stats.failures),
    durationMs: finiteNonNegative(stats.wallClockDuration ?? stats.duration),
  };
}

function testState(test) {
  const attempts = Array.isArray(test.attempts) ? test.attempts : [];
  const lastAttempt = attempts.at(-1);
  return {
    title: compactLabel(
      Array.isArray(test.title) ? test.title.join(' > ') : String(test.title || '')
    ),
    state: compactLabel(test.state || lastAttempt?.state || 'unknown'),
    attempts: attempts.length,
    error: lastAttempt?.error?.message ? compactError(lastAttempt.error.message) : null,
  };
}

function buildRunManifest(results, runtime) {
  if (!results || typeof results !== 'object') return null;

  const runs = (Array.isArray(results.runs) ? results.runs : []).map((run) => ({
    spec: compactLabel(run.spec?.relative || run.spec?.name || 'unknown'),
    stats: compactStats(run.stats),
    tests: (Array.isArray(run.tests) ? run.tests : []).map(testState),
  }));

  return {
    schemaVersion: 1,
    runId: runtime.runId,
    baseUrl: sanitizeUrl(runtime.baseUrl),
    browser: {
      name: boundedText(results.browserName || '', MAX_RUNTIME_LABEL_LENGTH) || null,
      version: boundedText(results.browserVersion || '', MAX_RUNTIME_LABEL_LENGTH) || null,
    },
    platform: {
      name: boundedText(results.osName || '', MAX_RUNTIME_LABEL_LENGTH) || null,
      version: boundedText(results.osVersion || '', MAX_RUNTIME_LABEL_LENGTH) || null,
    },
    cypressVersion:
      boundedText(results.cypressVersion || '', MAX_RUNTIME_LABEL_LENGTH) || null,
    totals: {
      tests: finiteNonNegative(results.totalTests) ?? 0,
      passed: finiteNonNegative(results.totalPassed) ?? 0,
      failed: finiteNonNegative(results.totalFailed) ?? 0,
      pending: finiteNonNegative(results.totalPending) ?? 0,
      skipped: finiteNonNegative(results.totalSkipped) ?? 0,
      durationMs: finiteNonNegative(results.totalDuration) ?? 0,
    },
    runs,
  };
}

function writeRunManifest(projectRoot, runtime, results) {
  const manifest = buildRunManifest(results, runtime);
  if (!manifest) return null;

  const reportsDir = path.join(projectRoot, 'reports');
  const output = path.join(reportsDir, 'run-manifest.json');
  const temporary = `${output}.tmp`;
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, output);
  return output;
}

module.exports = {
  buildRunManifest,
  compactError,
  redactText,
  sanitizeUrl,
  writeRunManifest,
};
