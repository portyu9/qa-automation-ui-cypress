'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_ERROR_LENGTH = 2_000;
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

function compactError(value) {
  const text = redactText(value);
  return text.length <= MAX_ERROR_LENGTH
    ? text
    : `${text.slice(0, MAX_ERROR_LENGTH)}…<truncated>`;
}

function testState(test) {
  const attempts = Array.isArray(test.attempts) ? test.attempts : [];
  const lastAttempt = attempts.at(-1);
  return {
    title: Array.isArray(test.title) ? test.title.join(' > ') : String(test.title || ''),
    state: test.state || lastAttempt?.state || 'unknown',
    attempts: attempts.length,
    error: lastAttempt?.error?.message ? compactError(lastAttempt.error.message) : null,
  };
}

function buildRunManifest(results, runtime) {
  if (!results || typeof results !== 'object') return null;

  const runs = (results.runs || []).map((run) => ({
    spec: run.spec?.relative || run.spec?.name || 'unknown',
    stats: run.stats || {},
    tests: (run.tests || []).map(testState),
  }));

  return {
    schemaVersion: 1,
    runId: runtime.runId,
    baseUrl: sanitizeUrl(runtime.baseUrl),
    browser: {
      name: results.browserName || null,
      version: results.browserVersion || null,
    },
    platform: {
      name: results.osName || null,
      version: results.osVersion || null,
    },
    cypressVersion: results.cypressVersion || null,
    totals: {
      tests: results.totalTests ?? 0,
      passed: results.totalPassed ?? 0,
      failed: results.totalFailed ?? 0,
      pending: results.totalPending ?? 0,
      skipped: results.totalSkipped ?? 0,
      durationMs: results.totalDuration ?? 0,
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
