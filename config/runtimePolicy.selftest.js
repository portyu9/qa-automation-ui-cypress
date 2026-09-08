'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function qualifiedMajors(range) {
  assert.equal(typeof range, 'string', 'package.json engines.node must be a string');
  const clauses = range.split('||').map((value) => value.trim()).filter(Boolean);
  assert.ok(clauses.length > 0, 'package.json engines.node must declare qualified Node lines');

  const majors = clauses.map((clause) => {
    const match = /^>=\s*(\d+)(?:\.0\.0)?\s+<\s*(\d+)$/.exec(clause);
    assert.ok(match, `engines.node must use explicit single-major ranges: ${clause}`);
    const lower = Number(match[1]);
    const upper = Number(match[2]);
    assert.equal(upper, lower + 1, `engines.node clause must qualify exactly one major: ${clause}`);
    return lower;
  });

  const unique = [...new Set(majors)].sort((left, right) => left - right);
  assert.equal(unique.length, majors.length, 'engines.node must not repeat a qualified major');
  return unique;
}

function versionMajor(value, label) {
  const match = /^(\d+)\.\d+\.\d+$/.exec(String(value).trim());
  assert.ok(match, `${label} must pin an exact major.minor.patch Node version`);
  return Number(match[1]);
}

function exactEnvVersion(workflow, name, label) {
  const pattern = new RegExp(`^\\s{2}${name}:\\s*["']?([0-9]+\\.[0-9]+\\.[0-9]+)["']?\\s*$`, 'm');
  const match = pattern.exec(workflow);
  assert.ok(match, `${label} must define one exact ${name}`);
  return match[1];
}

function primaryRuntime(ci) {
  const version = exactEnvVersion(ci, 'NODE_VERSION', 'ci.yml');
  return { version, major: versionMajor(version, 'ci.yml NODE_VERSION') };
}

function packageManagerNpm(packageManager) {
  const match = /^npm@(\d+\.\d+\.\d+)$/.exec(String(packageManager || '').trim());
  assert.ok(match, 'package.json packageManager must pin npm as npm@major.minor.patch');
  return match[1];
}

function workflowNpmVersion(workflow, label) {
  const version = exactEnvVersion(workflow, 'NPM_VERSION', label);
  assert.ok(
    workflow.includes('npm@${NPM_VERSION}'),
    `${label} must install npm through the governed NPM_VERSION`
  );
  assert.ok(
    workflow.includes('$(npm --version)'),
    `${label} must verify the installed npm version`
  );
  return version;
}

function extendedRows(workflow) {
  const rows = [];
  const rowPattern = /-\s+lane:\s*([^\n]+)\n\s+node:\s*([0-9]+\.[0-9]+\.[0-9]+)\n\s+browser:\s*([^\s#]+)/g;
  for (const match of workflow.matchAll(rowPattern)) {
    rows.push({
      lane: match[1].trim(),
      node: match[2],
      major: versionMajor(match[2], `extended lane ${match[1].trim()}`),
      browser: match[3].trim(),
    });
  }
  assert.ok(rows.length > 0, 'extended.yml must define explicit Node/browser compatibility rows');
  return rows;
}

const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
const extended = fs.readFileSync('.github/workflows/extended.yml', 'utf8');
const security = fs.readFileSync('.github/workflows/security.yml', 'utf8');

const engine = packageJson.engines?.node;
assert.equal(
  packageLock.packages?.['']?.engines?.node,
  engine,
  'package-lock root Node engine must match package.json'
);

const supported = qualifiedMajors(engine);
const primary = primaryRuntime(ci);
const expectedPrimary = Math.max(...supported);
assert.equal(
  primary.major,
  expectedPrimary,
  `primary CI must qualify the newest declared Node major (${expectedPrimary})`
);

const rows = extendedRows(extended);
const browserCompatibility = rows.filter((row) => row.lane === 'browser-compatibility');
assert.deepEqual(
  browserCompatibility.map(({ major, browser }) => ({ major, browser })),
  [{ major: primary.major, browser: 'firefox' }],
  'browser-compatibility must hold the primary Node line constant and exercise Firefox'
);

const maintenanceMajors = supported.filter((major) => major !== primary.major);
const runtimeCompatibility = rows
  .filter((row) => row.lane === 'maintenance-lts-runtime')
  .map(({ major, browser }) => ({ major, browser }))
  .sort((left, right) => left.major - right.major);
assert.deepEqual(
  runtimeCompatibility,
  maintenanceMajors.map((major) => ({ major, browser: 'chrome' })),
  'maintenance runtime lanes must qualify every non-primary supported Node major in Chrome'
);

const qualifiedByWorkflows = [...new Set([primary.major, ...rows.map((row) => row.major)])].sort(
  (left, right) => left - right
);
assert.deepEqual(
  qualifiedByWorkflows,
  supported,
  'declared Node majors must exactly match the majors exercised by CI and Extended'
);

assert.equal(
  rows.length,
  browserCompatibility.length + runtimeCompatibility.length,
  'extended.yml contains an unclassified Node/browser compatibility row'
);

const securityNode = exactEnvVersion(security, 'NODE_VERSION', 'security.yml');
assert.equal(
  securityNode,
  primary.version,
  'security.yml must use the same exact primary Node runtime as ci.yml'
);

const npmVersion = packageManagerNpm(packageJson.packageManager);
for (const [label, workflow] of [
  ['ci.yml', ci],
  ['extended.yml', extended],
  ['security.yml', security],
]) {
  assert.equal(
    workflowNpmVersion(workflow, label),
    npmVersion,
    `${label} NPM_VERSION must match package.json packageManager`
  );
}

console.log(
  `Node/npm runtime policy contract: engines=${engine}; primary=${primary.version}; supported=${supported.join(',')}; npm=${npmVersion}`
);
