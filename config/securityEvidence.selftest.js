'use strict';

const assert = require('node:assert/strict');
const {
  EXPECTED_TRIVY_VERSION,
  MIN_DEPENDENCY_PACKAGES,
  validateNpmAudit,
  validateTrivy,
} = require('./securityEvidence');

function lockFixture() {
  const packages = {
    '': {
      devDependencies: { cypress: '^15.21.1' },
    },
    'node_modules/cypress': { version: '15.21.1' },
  };
  for (let index = 1; index < MIN_DEPENDENCY_PACKAGES; index += 1) {
    packages[`node_modules/fixture-package-${index}`] = { version: `1.0.${index}` };
  }
  return { lockfileVersion: 3, packages };
}

function trivyPackages() {
  const packages = [{ Name: 'cypress', Version: '15.21.1', ID: 'cypress@15.21.1' }];
  for (let index = 1; index < MIN_DEPENDENCY_PACKAGES; index += 1) {
    packages.push({
      Name: `fixture-package-${index}`,
      Version: `1.0.${index}`,
      ID: `fixture-package-${index}@1.0.${index}`,
    });
  }
  return packages;
}

const lock = lockFixture();
const audit = {
  metadata: {
    vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
    dependencies: {
      prod: 1,
      dev: MIN_DEPENDENCY_PACKAGES,
      optional: 1,
      peer: 0,
      peerOptional: 0,
      total: MIN_DEPENDENCY_PACKAGES,
    },
  },
};
const trivy = {
  SchemaVersion: 2,
  Trivy: { Version: EXPECTED_TRIVY_VERSION },
  Results: [
    {
      Target: 'package-lock.json',
      Class: 'lang-pkgs',
      Type: 'npm',
      Packages: trivyPackages(),
      Vulnerabilities: null,
    },
  ],
};

assert.doesNotThrow(() => validateNpmAudit(audit, lock));
assert.doesNotThrow(() => validateTrivy(trivy, lock));

const highAudit = structuredClone(audit);
highAudit.metadata.vulnerabilities.high = 1;
assert.throws(() => validateNpmAudit(highAudit, lock), /gated advisories/);

const shallowAudit = structuredClone(audit);
shallowAudit.metadata.dependencies.total = MIN_DEPENDENCY_PACKAGES - 1;
assert.throws(() => validateNpmAudit(shallowAudit, lock), /unexpectedly small/);

const wrongScanner = structuredClone(trivy);
wrongScanner.Trivy.Version = '0.0.0';
assert.throws(() => validateTrivy(wrongScanner, lock), /Trivy version mismatch/);

const missingCypress = structuredClone(trivy);
missingCypress.Results[0].Packages[0] = {
  Name: 'not-cypress',
  Version: '15.21.1',
  ID: 'not-cypress@15.21.1',
};
assert.throws(() => validateTrivy(missingCypress, lock), /does not contain locked Cypress/);

const shallowTrivy = structuredClone(trivy);
shallowTrivy.Results[0].Packages = shallowTrivy.Results[0].Packages.slice(0, MIN_DEPENDENCY_PACKAGES - 1);
assert.throws(() => validateTrivy(shallowTrivy, lock), /unexpectedly small/);

const highTrivy = structuredClone(trivy);
highTrivy.Results[0].Vulnerabilities = [{ Severity: 'HIGH', VulnerabilityID: 'CVE-TEST' }];
assert.throws(() => validateTrivy(highTrivy, lock), /HIGH\/CRITICAL npm findings/);

console.log('Cypress security evidence contract: ok');
