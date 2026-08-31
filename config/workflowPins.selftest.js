'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workflowDirectory = path.join(process.cwd(), '.github', 'workflows');
const actionReference = /^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/;
const immutableSha = /^[^@\s]+@[0-9a-f]{40}$/i;
const failures = [];

for (const entry of fs.readdirSync(workflowDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
  const workflowPath = path.join(workflowDirectory, entry.name);
  const lines = fs.readFileSync(workflowPath, 'utf8').split(/\r?\n/u);

  lines.forEach((line, index) => {
    const match = line.match(actionReference);
    if (!match) return;
    const reference = match[1];
    if (reference.startsWith('./')) return;
    if (!immutableSha.test(reference)) {
      failures.push(`${entry.name}:${index + 1}: mutable action reference ${reference}`);
    }
  });
}

if (failures.length > 0) {
  throw new Error(`GitHub Action references must use full immutable commit SHAs:\n${failures.join('\n')}`);
}

console.log('workflow action pin contract: ok');
