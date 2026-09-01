'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_TRIVY_VERSION = '0.74.0';
const MIN_DEPENDENCY_PACKAGES = 150;

function fail(message) {
  throw new Error(`Cypress security evidence: ${message}`);
}

function readJson(filePath, label) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') fail(`${label} is missing: ${filePath}`);
    throw error;
  }
  if (!content.trim()) fail(`${label} is empty: ${filePath}`);
  try {
    return JSON.parse(content);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) fail(`${label} must be a non-negative integer`);
  return number;
}

function lockContract(lock) {
  if (lock?.lockfileVersion !== 3 || !lock?.packages || typeof lock.packages !== 'object') {
    fail('package-lock.json must use lockfileVersion 3 with a packages map');
  }
  const declared = String(lock.packages['']?.devDependencies?.cypress || '').trim();
  const version = String(lock.packages['node_modules/cypress']?.version || '').trim();
  if (!declared || !version) fail('package-lock.json must declare and resolve Cypress');

  const lockedPackages = Object.keys(lock.packages).filter((entry) => entry.startsWith('node_modules/')).length;
  if (lockedPackages < MIN_DEPENDENCY_PACKAGES) {
    fail(`locked dependency graph is unexpectedly small: ${lockedPackages}`);
  }
  return { declared, version, lockedPackages };
}

function validateNpmAudit(report, lock) {
  const { lockedPackages } = lockContract(lock);
  const vulnerabilities = report?.metadata?.vulnerabilities;
  const dependencies = report?.metadata?.dependencies;
  if (!vulnerabilities || typeof vulnerabilities !== 'object') {
    fail('npm Audit JSON is missing vulnerability metadata');
  }
  if (!dependencies || typeof dependencies !== 'object') {
    fail('npm Audit JSON is missing dependency metadata');
  }

  const high = nonNegativeInteger(vulnerabilities.high ?? 0, 'npm Audit high count');
  const critical = nonNegativeInteger(vulnerabilities.critical ?? 0, 'npm Audit critical count');
  const total = nonNegativeInteger(dependencies.total, 'npm Audit dependency total');
  const dev = nonNegativeInteger(dependencies.dev, 'npm Audit dev dependency total');

  if (high !== 0 || critical !== 0) {
    fail(`npm Audit contains gated advisories: high=${high}, critical=${critical}`);
  }
  if (total < MIN_DEPENDENCY_PACKAGES || dev < MIN_DEPENDENCY_PACKAGES) {
    fail(`npm Audit dependency graph is unexpectedly small: total=${total}, dev=${dev}`);
  }
  if (total + 1 < lockedPackages) {
    fail(`npm Audit graph does not reconcile with the lockfile floor: audit=${total}, locked=${lockedPackages}`);
  }

  return { high, critical, total, dev, lockedPackages };
}

function validateTrivy(report, lock) {
  const { version: expectedCypressVersion, lockedPackages } = lockContract(lock);
  if (report?.SchemaVersion !== 2) fail(`Trivy SchemaVersion must be 2: ${report?.SchemaVersion}`);
  if (report?.Trivy?.Version !== EXPECTED_TRIVY_VERSION) {
    fail(`Trivy version mismatch: expected=${EXPECTED_TRIVY_VERSION}, actual=${report?.Trivy?.Version}`);
  }
  if (!Array.isArray(report?.Results)) fail('Trivy Results must be an array');

  const npmResults = report.Results.filter(
    (result) => result?.Type === 'npm' || String(result?.Target || '').includes('package-lock.json')
  );
  if (npmResults.length === 0) fail('Trivy did not attribute any result to the npm lockfile');

  const packageMap = new Map();
  const gatedVulnerabilities = [];
  for (const result of npmResults) {
    for (const pkg of Array.isArray(result?.Packages) ? result.Packages : []) {
      const name = String(pkg?.Name || '').trim();
      const version = String(pkg?.Version || '').trim();
      if (name && version) packageMap.set(`${name}@${version}`, { name, version });
    }
    for (const vulnerability of Array.isArray(result?.Vulnerabilities) ? result.Vulnerabilities : []) {
      const severity = String(vulnerability?.Severity || '').toUpperCase();
      if (severity === 'HIGH' || severity === 'CRITICAL') gatedVulnerabilities.push(vulnerability);
    }
  }

  if (packageMap.size < MIN_DEPENDENCY_PACKAGES) {
    fail(`Trivy npm package inventory is unexpectedly small: ${packageMap.size}`);
  }
  if (packageMap.size + 5 < lockedPackages) {
    fail(`Trivy npm inventory is materially smaller than the lockfile: trivy=${packageMap.size}, locked=${lockedPackages}`);
  }
  if (!packageMap.has(`cypress@${expectedCypressVersion}`)) {
    fail(`Trivy npm inventory does not contain locked Cypress ${expectedCypressVersion}`);
  }
  if (gatedVulnerabilities.length !== 0) {
    fail(`Trivy contains ${gatedVulnerabilities.length} HIGH/CRITICAL npm findings`);
  }

  return {
    trivyVersion: EXPECTED_TRIVY_VERSION,
    npmPackages: packageMap.size,
    lockedPackages,
    cypressVersion: expectedCypressVersion,
    gatedVulnerabilities: 0,
  };
}

function main() {
  const [mode, reportPath, lockPath = path.join(process.cwd(), 'package-lock.json')] = process.argv.slice(2);
  if (!['npm-audit', 'trivy'].includes(mode) || !reportPath) {
    fail('usage: node config/securityEvidence.js <npm-audit|trivy> <report.json> [package-lock.json]');
  }

  const lock = readJson(lockPath, 'package lock');
  const report = readJson(reportPath, `${mode} report`);
  if (mode === 'npm-audit') {
    const evidence = validateNpmAudit(report, lock);
    console.log(
      `npm Audit evidence: dependencies=${evidence.total}, dev=${evidence.dev}, locked=${evidence.lockedPackages}, high=0, critical=0`
    );
  } else {
    const evidence = validateTrivy(report, lock);
    console.log(
      `Trivy evidence: version=${evidence.trivyVersion}, npmPackages=${evidence.npmPackages}, locked=${evidence.lockedPackages}, cypress=${evidence.cypressVersion}, highCritical=0`
    );
  }
}

if (require.main === module) main();

module.exports = {
  EXPECTED_TRIVY_VERSION,
  MIN_DEPENDENCY_PACKAGES,
  lockContract,
  validateNpmAudit,
  validateTrivy,
};
