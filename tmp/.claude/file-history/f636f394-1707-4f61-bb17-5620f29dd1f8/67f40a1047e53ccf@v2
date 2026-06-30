# Rebuild the Bug-Bounty Scanner into a High-Signal AST Engine

## Context

`C:\bugBounty` is a personal bug-bounty toolkit aimed at Coinbase's open-source
repos. It is legitimate defensive security work — static analysis of published
open-source code for responsible disclosure via HackerOne. The problem is that
the toolkit as built actively *hurts* that goal:

- **Three overlapping scanners** (`bug_hunter.py`, `quick_scan.py`,
  `coinbase_repo_scanner.py`) detect via naive string/regex matching with a
  ~100% false-positive rate. They flag `verify=False` inside comments, `api_key=`
  in example docs, "Missing SECURITY.md" (39×), and commit messages containing
  the word "security". ~60–70% of their code is copy-pasted.
- **The docs are hype + fabrication**: `MISSION_COMPLETE.md`,
  `FIRST/SECOND/THIRD_BUG_FOUND.md` present *templates* as validated findings,
  with contradictory bug counts (1 vs 4 vs 6 vs 7) and invented "$200,000+"
  projections. `repos.json` is a saved GitHub rate-limit **error message**.
- **One finding is genuinely real** and I verified it firsthand: line 150 of
  `coinbase/websocket/websocket_base.py` passes a bare `ssl.SSLContext()` to
  `websockets.connect()`. A bare context defaults to `verify_mode=CERT_NONE` and
  `check_hostname=False`, disabling certificate verification on every `wss://`
  connection (MITM risk, CWE-295). It is **still present in the latest upstream
  release v1.8.3** (fetched 2026-06-12; changelog shows no SSL fix ever), and no
  public CVE/report surfaced in search.

**Chosen direction (user-selected): rebuild the scanner engine.** Goal: collapse
the three scripts into ONE reusable, AST/context-aware Python package whose
defining property is **near-zero false positives, proven by tests** — plus real
CVSS scoring, scope + dedup awareness, safe source acquisition, and grounded
(no-hype) reporting. Submission is secondary; the engine is the deliverable.

A scanner that submits noise gets a researcher banned. Killing false positives
is therefore both the engineering win and the responsible-disclosure win.

---

## Target architecture

Stdlib-first. The **core local-scan path has zero third-party dependencies** so
`python -m scanner <path>` runs anywhere (verified host is Python 3.11.9; Bandit
and Semgrep are **not** installed, so they can only ever be optional).

```
bugBounty/
  pyproject.toml          # package + console_script "bbscan"; extras: [remote] [report] [dev]
  README.md               # rewritten: factual, no emojis, no $ claims
  CLAUDE.md               # rewritten — current one invents Tools/Repos and mis-describes the bug
  .gitignore              # targets/ out/*.json(except known_findings) *.pem .venv __pycache__
  scope.yaml              # in/out-of-scope globs (PyYAML optional; scope.json fallback)
  rules.yaml              # rule enable/disable + per-rule CVSS vector

  scanner/
    __main__.py           # python -m scanner -> cli.main()
    cli.py                # argparse: scan-local / scan-remote / report
    models.py             # Finding, Report, Severity, Confidence (+ JSON round-trip)
    cvss.py               # CVSS v3.1 vector -> base score (stdlib only)
    context.py            # FileContext: parse once, link parent pointers, snippet helper
    engine.py             # Engine.scan(root)->list[Finding]; + scan_path/scan_source facades
    suppression.py        # path skip, placeholder/test heuristics, # nosec, scope hook
    walker.py             # filesystem walk -> FileContext stream (prunes skip dirs)
    rules/
      __init__.py         # @register decorator + auto-import discovery
      base.py             # Rule (ABC) + AstRule + RuleVisitor + finding() factory
      insecure_ssl.py     # PY-SSL-001  (flagship)
      hardcoded_secret.py # PY-SEC-001
      dangerous_calls.py  # PY-EXEC-001 (eval/exec/subprocess shell=True)
    acquire/
      git_source.py       # safe clone via subprocess.run([...], shell=False), timeout, verify
      github_api.py       # authed client: X-RateLimit handling, jittered backoff, pagination
    reporting/
      json_report.py  sarif_report.py  markdown_report.py   # HackerOne md, validated-only

  tests/
    conftest.py  test_cvss.py  test_models.py
    test_rule_ssl.py  test_rule_secrets.py
    test_false_positives.py  test_e2e_coinbase.py  test_metrics.py
    fixtures/{ssl,secrets,false_positives,expected}/...

  targets/coinbase-advanced-py/    # SINGLE consolidated checkout (gitignored, re-clonable)
  out/<repo>/<run-id>/{findings.json,report.md,report.sarif}
  out/known_findings.json          # dedup store — COMMITTED (project memory)
  assets/poc/ssl_mitm/             # preserved real PoC (generate_cert, mitm_server, mitm_client)
  docs/findings/INSECURE_SSL_websocket_base.md   # the one real report, corrected
```

**Consolidate the two duplicate target copies** (`C:\bugBounty\coinbase-advanced-py\`
and `C:\bugBounty\repos\coinbase-advanced-py\`, both identical at v1.8.2) into one
`targets/coinbase-advanced-py/`.

---

## Detection engine (the core)

**Build-vs-leverage: hybrid, custom-AST-first.** Hand-roll the core on stdlib
`ast`; expose optional Bandit/Semgrep adapters behind the same `Finding` model
(`--engines bandit,semgrep`, skipped with a warning if not installed). Rationale:
the user asked for an AST engine; the FP-control logic *is* the product; zero-dep
core keeps "just run it" working; don't reinvent breadth — shell out to mature
tools for that and normalize their JSON. Cross-engine dedup keys on
`(file, line, cwe)` so a native `PY-SSL-001` and Bandit `B502` on the same line
collapse to one corroborated finding.

**`Finding` model** (`models.py`) — severity is **derived from the CVSS score,
never hand-set**:

```python
@dataclass(frozen=True)
class Finding:
    rule_id: str; message: str
    file: str                 # path RELATIVE to scan root (stable across machines)
    line: int; col: int; snippet: str
    cvss_vector: str          # rule supplies this
    cvss_score: float         # cvss.compute(vector)
    severity: Severity        # bucket derived from score
    confidence: Confidence = Confidence.PROBABLE   # only CONFIRMED reaches HackerOne md
    cwe: str | None = None; remediation: str = ""; references: tuple = ()
    in_scope: bool = True; suppressed: bool = False; suppressed_reason: str | None = None
    @property
    def fingerprint(self) -> str: ...   # sha of rule_id + rel_file + normalized_line
```

**`FileContext`** parses each file once (`ast.parse`), links parent pointers
(stdlib nodes lack them), and exposes `segment(node)` via `ast.get_source_segment`.
A `SyntaxError` returns `None` → file skipped, never crashes the run.

**Rules** subclass `Rule`/`AstRule`, declare `id/severity/cwe/remediation`,
implement `analyze(ctx) -> Iterator[Finding]`, and `@register`. Adding a rule =
drop a file in `rules/`; `all_rules(select, skip)` auto-discovers it.

**False-positive suppression — four cooperating layers** (every legacy FP is
killed by ≥2 of them):

1. **Path pruning** (`walker.py`): skip `tests/ examples/ docs/ fixtures/ vendor/
   node_modules/ build/ dist/ .venv/ migrations/` etc. during `os.walk`. This
   alone removes all 14 secret-shaped hits in `coinbase-advanced-py/tests/`,
   including the real-format PEM in `tests/constants.py`. Case-insensitive,
   `--include-tests` to opt back in.
2. **AST inherency**: rules visit nodes, so comments don't exist and string
   literals are inert `ast.Constant`s. `verify=False` in a comment/string is
   structurally unreachable as a kwarg. No regex over raw source in the native path.
3. **Placeholder / env / test-value recognition** (secrets): suppress when the
   value is `os.environ[...]`/`os.getenv(...)` (a `Subscript`/`Call`, not a
   `Constant`), a `Name` ref, an f-string, matches `YOUR_KEY_HERE|<...>|example|
   test|xxx+`, is < 8 chars, or the target name carries a `TEST_` token.
4. **Intra-function dataflow** (SSL): if `ssl.SSLContext()` is bound to a name,
   walk the enclosing function for hardening of that name (`check_hostname=True`,
   `verify_mode != CERT_NONE`, `load_verify_locations/load_default_certs`) →
   suppress. Inline use (the Coinbase case, no binding) can't be hardened → report.

Plus inline `# nosec` / `# noqa: <rule>` and a scope hook — all suppression can
only *remove*, never add, findings.

**Flagship rule `PY-SSL-001`** (`rules/insecure_ssl.py`), CVSS
`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` → **7.5 / HIGH**:
- Match `ast.Call` whose func is `ssl.SSLContext` / bare `SSLContext` /
  `ssl._create_unverified_context` (NOT `create_default_context` → never flagged).
- Skip if hardened-in-scope (layer 4). Inline-arg use → flag at the call's exact
  line/col with the source segment.
- Verified behavior: FLAGS `websocket_base.py:150`; silent on
  `create_default_context()`, hardened-after, and `ssl=None`.

---

## Pipeline, scoring, scope, reporting, CLI

- **`cvss.py`** — official FIRST v3.1 base-score formula (ISS, Impact,
  Exploitability, scope-aware PR table, `roundup = ceil(x*10)/10`). Anchor test:
  the SSL vector must compute to exactly **7.5 (High)**; also assert published
  vectors 0.0 / 5.5 / 9.8 and a Scope:Changed case. Each rule carries its vector
  in `rules.yaml`; **drop the fake `$`-bounty estimator entirely**.
- **`acquire/git_source.py`** — replaces `os.system(f"git clone ...")`. Validate
  `repo` against `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`, build a fixed argv list,
  `subprocess.run([...], shell=False, timeout=300)`, then confirm success with
  `git -C dest rev-parse --is-inside-work-tree` (not blind `path.exists()`).
- **`acquire/github_api.py`** — `requests.Session`, `Authorization: Bearer
  $GITHUB_TOKEN` when present (env only, never a flag), reads `X-RateLimit-Remaining`
  and sleeps to `Reset`, jittered exponential backoff on 403/429 honoring
  `Retry-After`, RFC-5988 `Link` pagination. `scan-remote` clones then scans the
  **local checkout** — the old README-only remote heuristics are dropped.
- **Scope** (`scope.yaml` + `suppression.py`): in/out-of-scope globs; out-of-scope
  wins; paths normalized to `/` so Windows `tests\constants.py` matches
  `tests/**`. `on_out_of_scope: suppress|flag`.
- **Dedup** (`out/known_findings.json`, committed): fingerprint =
  `sha(rule_id + rel_file + normalized_line)`; records carry
  `status: open|reported|fixed|wontfix|duplicate`, `reported_to`, `cve`. Re-scans
  surface only NEW, in-scope, non-stale findings; anything reported upstream or
  with a CVE is filtered.
- **Reporting** (`reporting/`): JSON, SARIF 2.1.0 (GitHub code scanning), and a
  HackerOne-style markdown rendered **only from `Report.validated()`** (confirmed
  ∧ in-scope ∧ not suppressed). Enforced in code: **no emojis, no `$`, no
  "MISSION COMPLETE"**; zero validated findings → write nothing.
- **CLI** (`cli.py`, one entry point replacing all three scripts):
  ```
  bbscan scan-local PATH   [--rules-select ID,..] [--format json|markdown|sarif]
                           [--min-severity low] [--fail-on none|any|high|critical]
  bbscan scan-remote OWNER/REPO|ORG  [--ref REF] [--max-repos N] (+ scan-local flags)
  bbscan report findings.json  [--validated-only] [--format markdown]
  ```
  Scan date = `datetime.now(timezone.utc)` at run start (replaces hardcoded
  `'2025-01-13'`); no hardcoded org/path anywhere.

---

## Test & validation — proof of near-zero FP

- **Fixture corpus** `tests/fixtures/`: paired VULN/SAFE per rule. SSL: bare
  `SSLContext()` (flag) vs `create_default_context()`, hardened-after, `ssl=None`,
  omitted (all 0). Secrets: real literal (flag) vs env-read, placeholder,
  header-name constant (all 0). VULN files carry a `# FLAG: <rule_id>` marker so
  tests resolve expected lines **without magic numbers**.
- **`test_false_positives.py`** — one test per legacy FP class (verify=False in
  comment, placeholder `api_key`, the verbatim target README L46-47 PEM
  placeholder, `v1.2.3` version string, missing-SECURITY.md dir, "security" commit
  word), each asserting **0 findings**. This file is the proof-of-improvement.
- **`test_e2e_coinbase.py`** (skip if target absent): assert exactly one
  `PY-SSL-001` at `websocket_base.py:150` (HIGH); assert no SECURITY.md noise,
  nothing under `tests/**`, no README secret finding, total findings ≤ 5.
- **`test_metrics.py`** — precision/recall over the labeled corpus. **Acceptance
  gates (all must pass): 0 FP on the safe+FP corpus, recall == 1.0, flagship TP
  confirmed, all legacy FP classes suppressed, e2e noise gates green, and a
  coverage tripwire that every registered rule has ≥1 VULN + ≥2 SAFE fixtures.**
- Keep the scanner's `pytest.ini` rootdir distinct from the target's `unittest`
  setup so collection doesn't vacuum in `targets/.../tests/**`. Read fixtures with
  `encoding="utf-8"` (PEM `\n`, em-dashes break cp1252 on Windows).

---

## Cleanup / migration

**DELETE** (hype/fabrication/junk): `MISSION_COMPLETE.md`, `FINAL_SUMMARY.md`,
`FIRST/SECOND/THIRD_BUG_FOUND.md`, `TWO_BUGS_FOUND.md`, `INITIALIZE_VULNERABILITY.md`,
`SUBMIT_NOW.md`, `PACKAGE_SUMMARY.md`, `SUBMISSION_GUIDE.md`; the error-message
`repos.json`; FP outputs `coinbase_scan_report.json`, `quick_scan_report.json`,
`reports/*`, `bug_report_templates.md`; legacy scripts `bug_hunter.py`,
`quick_scan.py`, `coinbase_repo_scanner.py`, `github_secret_scanner.py`,
`nextjs_bypass_scanner.py`, `submission_checklist.py`, `submission_review.py`,
`proof_of_concept*.py` (×3); the `repos/smart-wallet/` Solidity copy; and the
duplicate target checkouts (after consolidating to `targets/`).

**KEEP + REWRITE**: `README.md` → factual tool README. `CLAUDE.md` → correct the
invented `Tools/Repos` layout and the wrong `ssl_verify=False` description (actual
defect is `ssl.SSLContext()` at `websocket_base.py:150`). `VULNERABILITY_PATTERNS.md`
→ fold into rule-design notes if accurate.

**PRESERVE the one real finding**: move `INSECURE_SSL_BUG_REPORT.md` →
`docs/findings/INSECURE_SSL_websocket_base.md` (keep the 7.5 vector, **delete its
"Bounty Estimate $" section**); move the working PoC to `assets/poc/ssl_mitm/`
(`generate_cert.py`, `test_mitm_server.py`→`mitm_server.py`,
`test_mitm_client.py`→`mitm_client.py`; `*.pem` gitignored/regenerated); seed
`out/known_findings.json` with this finding as `status: open`.

---

## Implementation phases

1. **Scaffold**: `git init`, `pyproject.toml` (+extras), `.gitignore`, package skeleton.
2. **`cvss.py` + `test_cvss.py`** — lock SSL vector → 7.5 first; all severity derives from it.
3. **`models.py` + `context.py`** (+ round-trip test).
4. **`rules/base.py` + registry + `engine.py`** with `scan_path`/`scan_source` facades.
5. **Flagship `insecure_ssl.py` + suppression layers + fixtures + `test_rule_ssl.py` + `test_false_positives.py`** → hit the FP=0 / flagship-TP gates (the MVP 10X milestone).
6. **`hardcoded_secret.py`, `dangerous_calls.py`** + their fixtures/tests.
7. **`scope.yaml`/scope + dedup store** (seed the SSL finding).
8. **`acquire/` (git + github_api)** + tests.
9. **`reporting/` (json/sarif/markdown, validated-only)** + `cli.py` + `--fail-on` exit codes.
10. **`test_e2e_coinbase.py` + `test_metrics.py`**, then **cleanup/migration**, then rewrite `README.md` + `CLAUDE.md`.

Phases 1–5 deliver the core value (proven low-FP AST detection of the real bug);
6–10 add breadth, safety, scope/dedup, reporting, and the cleanup.

---

## Verification (Windows / PowerShell)

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"          # core is stdlib-only; dev adds pytest etc.

python -m pytest -q                         # full suite — must be green
python -m pytest -q tests\test_false_positives.py   # proof-of-improvement
python -m pytest -q -s tests\test_metrics.py        # FP=0, recall=1.0 gates

bbscan scan-local .\targets\coinbase-advanced-py --format markdown --fail-on high
#   expect: exactly one PY-SSL-001 @ coinbase\websocket\websocket_base.py:150 (HIGH);
#           no SECURITY.md noise, nothing under tests\, README clean.
```

**Done when**: all acceptance gates pass, the scanner finds the SSL bug and *none*
of the legacy noise, the three legacy scripts are deleted, and `README.md` +
`CLAUDE.md` accurately describe the new `scanner/` package.

---

## Critical files

- `C:\bugBounty\repos\coinbase-advanced-py\coinbase\websocket\websocket_base.py` — line 150, the flagship true positive (e2e oracle); consolidate to `targets/`.
- `C:\bugBounty\bug_hunter.py` — richest legacy scanner: `os.system` injection (L36), substring SSL check (L97), secret regexes (L53-60), hardcoded date/CVSS/bounty (L256/376-395). Primary parity reference, then delete.
- `C:\bugBounty\coinbase_repo_scanner.py` — source of the SECURITY.md / version / commit-keyword FP rules to drop, and unauthenticated GitHub calls to replace.
- `C:\bugBounty\quick_scan.py` — the `'api_key' in text and '=' in text` FP (L78).
- `C:\bugBounty\repos\coinbase-advanced-py\README.md` (L46-47) — real placeholder strings for FP fixtures.
- `C:\bugBounty\INSECURE_SSL_BUG_REPORT.md` — the one real report + correct CVSS vector to preserve (minus the `$` section).
- `C:\bugBounty\CLAUDE.md` — currently inaccurate; rewrite to the new package.
```