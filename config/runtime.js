'use strict';

function absoluteHttpUrl(name, fallback) {
  const raw = process.env[name] || fallback;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https`);
  }
  return raw.replace(/\/$/, '');
}

function positiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function loadRuntime() {
  return Object.freeze({
    baseUrl: absoluteHttpUrl('CYPRESS_BASE_URL', 'https://www.saucedemo.com'),
    commandTimeout: positiveInteger('CYPRESS_COMMAND_TIMEOUT_MS', 10_000),
    requestTimeout: positiveInteger('CYPRESS_REQUEST_TIMEOUT_MS', 10_000),
    responseTimeout: positiveInteger('CYPRESS_RESPONSE_TIMEOUT_MS', 30_000),
    pageLoadTimeout: positiveInteger('CYPRESS_PAGE_LOAD_TIMEOUT_MS', 60_000),
    runId: (process.env.TEST_RUN_ID || `local-${Date.now()}`).trim(),
  });
}

module.exports = { loadRuntime };
