from pathlib import Path
import re

path = Path('README.md')
text = path.read_text(encoding='utf-8')
marker = '## Dependency maintenance\n'
section = '''## Confidence boundaries

Cypress retryability is a powerful execution model, but a green browser run is still evidence about a defined boundary—not proof that every dependency, browser, environment, or timing condition is healthy.

| Signal | Confidence gained | Deliberate limit |
| --- | --- | --- |
| Repository-owned fixture | Cypress command scheduling, selectors, navigation, state transitions, negative behavior, and artifacts execute against deterministic application behavior | It does not prove deployed routing, TLS, identity providers, production data, or third-party dependencies |
| Primary Chrome gate | Covered critical UI behavior works in the primary qualified browser/runtime combination | It does not imply universal browser, device, viewport, operating-system, or accessibility coverage |
| Firefox compatibility | Covered contracts survive a deliberate browser-engine change while the application and runtime policy stay controlled | Compatibility evidence is scoped to the executed flows rather than complete cross-browser equivalence |
| `cy.intercept()` + aliases | The test owns a dependency condition and can attribute request/response-driven UI behavior causally | Stubbed conditions prove the stubbed contract; they do not prove the live dependency behaves the same way |
| `cy.session()` + `validate()` | Cached browser state is reused only after an executable usability check | Cache validation does not prove the upstream authentication system on every restored test path |
| `cy.clock()` / `cy.tick()` | Timer-dependent client behavior is deterministic at exact logical boundaries | Fake time does not prove distributed clocks, backend expiry, scheduler behavior, or real-world latency |
| Retry-recovered-pass rejection | CI can collect retry diagnostics without treating recovered instability as clean correctness | Retries do not diagnose root cause and should not be expanded to normalize flaky behavior |
| Manifest / screenshot / video evidence | Aggregate and per-test outcomes are reconciled and browser failures retain useful context | Screenshots/video can contain application-visible data; evidence retention and synthetic-data policy remain security controls |
| CodeQL / npm Audit / Trivy / dependency review | Independent controls inspect different source, dependency, repository, and change-diff risk surfaces | An all-green scanner set is not a proof of vulnerability absence |

Choose synchronization from **observable causal state**—DOM state, network completion, browser state, or controlled time—not elapsed-time guessing. Add deployed integration only when the requirement depends on deployed infrastructure rather than Cypress itself.

'''
if '## Confidence boundaries\n' not in text:
    if marker not in text:
        raise SystemExit('Dependency maintenance marker missing')
    text = text.replace(marker, section + marker)
path.write_text(text, encoding='utf-8')

patterns = [
    re.compile(r'\bNode(?:\.js)?\s+\d', re.I),
    re.compile(r'\bCypress\s+v?\d', re.I),
    re.compile(r'\bChrome\s+\d', re.I),
    re.compile(r'\bFirefox\s+\d', re.I),
    re.compile(r'\bnpm\s+v?\d', re.I),
]
candidates = []
for md in [Path('README.md'), *Path('docs').rglob('*.md')]:
    for number, line in enumerate(md.read_text(encoding='utf-8').splitlines(), 1):
        if any(pattern.search(line) for pattern in patterns):
            candidates.append(f'{md}:{number}: {line}')
if candidates:
    raise SystemExit('Residual Cypress/tool version candidates:\n' + '\n'.join(candidates))
