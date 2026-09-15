# Dependabot Recovery Contract

Dependency recovery addresses one narrow operational case: an otherwise-governable routine Dependabot pull request can fail qualification because of a proven transient infrastructure incident. Recovery may request one rerun of failed jobs in the existing exact-head workflow run. `dependency-governance` remains the only autonomous merge authority.

Recovery executes only from trusted default-branch code and reuses governance proofs for canonical Dependabot identity, one verified signed Dependabot commit, signed update metadata, current-`main` ancestry, and one allowlisted dependency ecosystem. It never pushes to a Dependabot branch, synthesizes commits, rewrites dependency files, changes Cypress/product/test code, or calls GitHub's update-branch endpoint. Stale proposals rely on Dependabot's native `rebase-strategy: auto`.

A failed required workflow is retryable only on its first attempt, with exactly one failed stable aggregate gate, no ambiguous sibling-job conclusions, exactly one failed step per failed leaf job, and an explicitly allowlisted infrastructure step. Only timestamped raw-log lines inside that failed step's own execution window count as evidence. A precise modeled transient network/service signature must be present and no deterministic blocker may be present.

The Cypress allowlist is deliberately limited to checkout/runtime setup, locked dependency installation, the explicit Cypress binary installation, and evidence uploads. Framework/configuration checks, Cypress verification and browser execution, retry-policy evidence validation, npm Audit, Trivy, CodeQL, Dependency Review, and aggregate gates are never retry candidates.

Deterministic dependency-resolution or lockfile failures, policy/client HTTP errors, permission failures, disk exhaustion, missing logs or timestamps, multiple failed steps, mixed transient and deterministic evidence, cancelled/timed-out/neutral/action-required/stale sibling jobs, a second failed attempt, stale ancestry, noncanonical provenance, major/downgrade/prerelease/unknown updates, or control-plane changes all stop recovery.

A rerun does not make a dependency safe. The repository's ordinary exact-head `ci`, `extended`, `security`, and `docs` gates must still become green. Governance then independently repeats provenance, semantic-scope, base-freshness, and workflow-identity checks before any merge. Deterministic or ambiguous failures remain red for investigation rather than being retried until green.
