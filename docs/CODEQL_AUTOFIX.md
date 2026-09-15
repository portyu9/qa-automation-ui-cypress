# CodeQL Autofix automation

This repository uses a review-only wrapper around GitHub's CodeQL Autofix REST API. The implementation is centralized in `portyu9/qa-automation-mobile-appium` and consumed here at immutable commit `9280e1cf79bea79c027eabc8abe355ad89e6c010`; repository-specific scope remains in `.github/codeql-autofix.json`.

The controller runs only from trusted default-branch code after a successful `security` workflow, on a bounded schedule, or by explicit default-branch dispatch. Pull requests execute only the unprivileged wrapper self-test.

For each explicitly targeted alert, the controller requires an open CodeQL finding on the exact current `main` SHA before asking GitHub to generate an Autofix. A successful suggestion is committed only to a new isolated security branch. The resulting diff is rejected if it exceeds file/line limits, omits the alert location, changes a denied path, uses a non-allowlisted source extension, removes or renames files, or is not based directly on the current default branch.

Accepted suggestions become **draft pull requests** and the repository's normal CI, Extended, Security, and Docs workflows are dispatched against that branch. The controller never merges a pull request, dismisses an alert, force-updates an existing branch, checks out generated code inside its privileged job, or weakens a qualification gate.

GitHub Autofix is best-effort. GitHub's explicit `422 Alert is not supported by autofix` response is recorded as an auditable `unsupported` result so a legitimate unsupported alert does not masquerade as an automation outage. Authentication, validation, API ambiguity, unexpected errors, and unsafe generated diffs remain hard failures.

The current bounded historical target set is alerts `#2` and `#3`. Both findings were already remediated in PR #50, so the first controller run is expected to observe them as closed and take no branch/PR action. That idempotent no-op is the correct result.
