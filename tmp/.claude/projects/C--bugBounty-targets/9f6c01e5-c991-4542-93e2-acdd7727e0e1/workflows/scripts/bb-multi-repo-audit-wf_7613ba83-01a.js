export const meta = {
  name: 'bb-multi-repo-audit',
  description: 'Comprehensive bug-bounty security audit across 5 cloned targets: fan-out deep-read finders, adversarial 3-lens verification, ranked synthesis',
  phases: [
    { title: 'Find', detail: 'deep-read finders per (target, vuln-class) cluster' },
    { title: 'Verify', detail: 'adversarial refute-by-default panel per candidate finding' },
    { title: 'Synthesize', detail: 'dedup, rank by severity x exploitability x payout' },
  ],
}

const TARGETS = `C:/bugBounty/targets`

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          target: { type: 'string' },
          file: { type: 'string', description: 'repo-relative path' },
          line: { type: 'integer' },
          vuln_class: { type: 'string' },
          cwe: { type: 'string' },
          severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low', 'Info'] },
          source: { type: 'string', description: 'where attacker-controlled input enters' },
          sink: { type: 'string', description: 'dangerous operation reached' },
          data_flow: { type: 'string', description: 'concrete path source->sink, with function names' },
          preconditions: { type: 'string' },
          exploitability: { type: 'string' },
          code_excerpt: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['title', 'target', 'file', 'vuln_class', 'severity', 'source', 'sink', 'data_flow', 'confidence'],
      },
    },
    coverage_notes: { type: 'string', description: 'what you read and what you could not rule out' },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    is_real: { type: 'boolean' },
    refuted: { type: 'boolean' },
    reason: { type: 'string' },
    attacker_controlled: { type: 'boolean' },
    sink_reachable: { type: 'boolean' },
    mitigation_present: { type: 'boolean' },
    adjusted_severity: { type: 'string' },
    exploit_sketch: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['is_real', 'refuted', 'reason', 'confidence'],
}

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    executive_summary: { type: 'string' },
    ranked_findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          rank: { type: 'integer' },
          title: { type: 'string' },
          target: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'integer' },
          vuln_class: { type: 'string' },
          cwe: { type: 'string' },
          severity: { type: 'string' },
          cvss_vector: { type: 'string' },
          why_high_value: { type: 'string' },
          exploitability: { type: 'string' },
          program_payout_note: { type: 'string' },
          suggested_next_step: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['rank', 'title', 'target', 'severity', 'why_high_value', 'suggested_next_step'],
      },
    },
    program_scope_notes: { type: 'string' },
    recommended_priority_order: { type: 'array', items: { type: 'string' } },
  },
  required: ['executive_summary', 'ranked_findings', 'program_scope_notes'],
}

const CLUSTERS = [
  // ---- Weblate (Django web app; large attack surface) ----
  { key: 'web-gitexport', target: 'weblate', base: `${TARGETS}/weblate/weblate/gitexport`,
    threat: 'Web-reachable git smart-HTTP export endpoint. Attackers: anonymous or low-priv authenticated web users sending crafted HTTP requests (path, query, service params). Goal classes: command injection into git http-backend/subprocess, path traversal to read arbitrary repos/files, authz bypass to clone private project repos, info disclosure of credentials in remote URLs.',
    classes: 'OS command injection, path traversal, broken access control (private repo exposure), credential leakage' },
  { key: 'web-vcs', target: 'weblate', base: `${TARGETS}/weblate/weblate/vcs`,
    threat: 'VCS layer that runs git/hg/ssh/gpg subprocesses with arguments derived from project configuration (repo URL, branch, push URL, credentials) set by project admins (a lower-privilege role than superuser) and sometimes from remote repo content. Watch for argument injection (values beginning with "-" or "--", git "ext::"/"fd::" transports, "file://"), SSRF via remote URL fetch, and credential exposure in process args/logs.',
    classes: 'OS command / argument injection, SSRF, credential exposure' },
  { key: 'web-ssrf-mt', target: 'weblate', base: `${TARGETS}/weblate/weblate/machinery`,
    threat: 'Machine-translation provider backends issue outbound HTTP requests. Some providers allow an admin/user-configured base URL or endpoint. Also inspect weblate/accounts/avatar.py and any requests/urlopen with user/component-influenced URLs across the repo. Goal: SSRF to cloud metadata (169.254.169.254) or internal services, blind SSRF, request smuggling.',
    classes: 'SSRF, outbound request forgery, DNS rebinding' },
  { key: 'web-ssti-xss', target: 'weblate', base: `${TARGETS}/weblate/weblate`,
    threat: 'Server-side template injection and stored XSS. Focus: utils/render.py (Django Template render of user-provided templates such as commit-message/addon templates), utils/markdown.py, utils/html.py, trans/templatetags/translations.py, mark_safe/format_html sites, addon configuration. Translators/project-admins supply template strings and translation content rendered into pages or commit messages.',
    classes: 'SSTI (Django template injection), stored/reflected XSS, HTML sanitizer bypass' },
  { key: 'web-sqli', target: 'weblate', base: `${TARGETS}/weblate/weblate`,
    threat: 'SQL injection via raw SQL. Find cursor.execute, .raw(, RawSQL, QuerySet.extra(, and string-formatted SQL where any fragment is user-influenced (search queries, filters, language/locale codes, ordering params). Focus utils/db.py, lang/models.py, auth/, memory/, trans/models, api filtering.',
    classes: 'SQL injection' },
  { key: 'web-authz-api', target: 'weblate', base: `${TARGETS}/weblate/weblate`,
    threat: 'Broken access control / IDOR / privilege escalation in the REST API and views. Focus api/views.py, api/permissions.py, auth/, accounts/views.py, trans/views/*. Look for object-level authz gaps (acting on objects by id without ownership/permission check), mass assignment, permission checks that trust client input, and unauthenticated state-changing endpoints.',
    classes: 'IDOR, broken access control, privilege escalation, mass assignment, CSRF' },
  { key: 'web-fileops', target: 'weblate', base: `${TARGETS}/weblate/weblate`,
    threat: 'File upload / archive extraction / path construction. Focus trans/views/files.py (upload), screenshots/ (image upload), formats/ (parsing uploaded translation files), addons file writes, any zipfile/tarfile extraction (zip-slip), and os.path.join with user filenames. Translators upload files; goal is path traversal, zip-slip arbitrary write, arbitrary file read.',
    classes: 'path traversal, zip-slip / arbitrary file write, arbitrary file read, unrestricted upload' },
  { key: 'web-deser-rce', target: 'weblate', base: `${TARGETS}/weblate/weblate`,
    threat: 'Insecure deserialization and code execution. Find yaml.load without SafeLoader (settings_docker.py uses it), pickle/marshal of untrusted data (cache, sessions, celery payloads), eval/exec, and addon/automation hooks that execute user-influenced code or scripts. Also check celery task argument trust boundaries.',
    classes: 'insecure deserialization (RCE), eval/exec injection, unsafe YAML' },

  // ---- Chia (P2P blockchain node; untrusted-peer network surface) ----
  { key: 'chia-daemon', target: 'chia-blockchain', base: `${TARGETS}/chia-blockchain/chia/daemon`,
    threat: 'The daemon exposes a local WebSocket control server (server.py) plus keychain_server.py/keychain_proxy.py. Threat: a process or web page able to reach the daemon websocket, or weak auth, leading to command/argument injection when launching plotters/services (subprocess), arbitrary command exec, path traversal in file ops, or keychain access without authorization. Check websocket origin/auth validation and how command names/args from messages reach subprocess.',
    classes: 'command/argument injection, missing/weak daemon auth, keychain access bypass, path traversal' },
  { key: 'chia-p2p-tls', target: 'chia-blockchain', base: `${TARGETS}/chia-blockchain/chia/server`,
    threat: 'Untrusted P2P peers connect over TLS. Focus ssl_context.py (cert generation/validation, allow-any-cert vs CA pinning), ws_connection.py (message framing/size limits), node_discovery.py + address_manager.py (peer address handling), upnp.py (UPnP), rate_limits*.py. Threat: a malicious peer. Goal classes: TLS/cert validation weakness or MITM, remote DoS (unbounded allocation, decompression, parsing), SSRF/abuse via UPnP or peer-supplied addresses.',
    classes: 'improper certificate validation / MITM, remote DoS, peer-data injection' },
  { key: 'chia-rpc', target: 'chia-blockchain', base: `${TARGETS}/chia-blockchain/chia/rpc`,
    threat: 'RPC server (rpc_server.py) and clients. Threat: a client able to reach the RPC port (sometimes bound beyond localhost, or reachable cross-origin via the websocket). Look at auth/origin checks, whether RPC handlers validate parameters, SSRF in any handler that fetches URLs, and exposure of keys/secrets through RPC responses.',
    classes: 'missing RPC auth, SSRF, parameter injection, secret/key disclosure' },
  { key: 'chia-keys', target: 'chia-blockchain', base: `${TARGETS}/chia-blockchain/chia/cmds`,
    threat: 'Key/seed/signing handling and CLI subprocess use. Focus signer.py, keys_funcs.py, start_funcs.py, init_funcs.py, plotters. Goal: private key / mnemonic exposure (logs, world-readable files, insecure temp), insecure randomness for key material, command/argument injection in start/plotter subprocess calls.',
    classes: 'key/secret exposure, insecure file permissions, weak randomness, command injection' },

  // ---- Coinbase (client SDK; MITM / malicious-server / local threat) ----
  { key: 'cb-sdk', target: 'coinbase-advanced-py', base: `${TARGETS}/coinbase-advanced-py/coinbase`,
    threat: 'Official Coinbase REST/WebSocket SDK that runs in the API consumer process and authenticates with API keys (JWT). Known issue to CONFIRM (not re-report as novel): bare ssl.SSLContext() in websocket/websocket_base.py disables cert verification (CWE-295). Also scrutinize jwt_generator.py (nonce/exp handling, alg confusion, key handling), api_base.py / rest/rest_base.py (TLS verify on requests, secret logging, error leakage), and any secret written to logs.',
    classes: 'improper certificate validation, JWT signing weakness, secret logging/exposure, TLS verify disabled' },
]

function finderPrompt(c) {
  return [
    `You are a senior application-security auditor performing a RESPONSIBLE-DISCLOSURE bug-bounty review of an open-source project. Be rigorous and skeptical; only report issues you can defend with a concrete data-flow.`,
    ``,
    `TARGET: ${c.target}`,
    `PRIMARY DIRECTORY (read every relevant .py here; recurse into subdirs): ${c.base}`,
    `You also have the whole repo at ${TARGETS}/${c.target} — Grep/Glob to follow call chains, base classes, callers, settings/defaults, and URL routing. READ FULL FILES, not just grep hits.`,
    ``,
    `THREAT MODEL FOR THIS CLUSTER:`,
    c.threat,
    ``,
    `VULNERABILITY CLASSES TO HUNT: ${c.classes}`,
    ``,
    `METHOD:`,
    `1. Identify the dangerous sinks in scope (subprocess/os calls, SQL execution, deserialization, template render, file path use, outbound HTTP, TLS context, crypto/key use, authz checks).`,
    `2. For each, trace BACKWARD to find whether an attacker-controlled source (per the threat model above) can reach it, naming the functions/handlers/routes on the path.`,
    `3. Check for mitigations on the path (parameterization, shlex/list-form subprocess, escaping/autoescape, allow-lists, permission decorators, size limits). If an effective mitigation exists, do NOT report it.`,
    `4. Determine reachability and required privilege. Anonymous/low-priv remote = highest value.`,
    ``,
    `RULES:`,
    `- Quality over quantity. Report at most 6 findings, ranked best-first. Zero findings is an acceptable and honest answer.`,
    `- Every finding needs: exact repo-relative file path, line number, the source, the sink, and the concrete source->sink data_flow with function names.`,
    `- Assign severity by realistic impact AND reachability (Critical/High only for remotely or low-priv reachable serious impact).`,
    `- Set confidence in [0,1]; be honest. Do not pad with theoretical/defense-in-depth nits.`,
    `Return ONLY the structured object.`,
  ].join('\n')
}

function verifyPrompt(f, lens, c) {
  const common = [
    `You are an adversarial security reviewer. Your job is to REFUTE the following candidate vulnerability. Default to refuted=true unless the evidence is solid. Read the actual code at the cited path before deciding.`,
    ``,
    `TARGET: ${f.target}  (repo root: ${TARGETS}/${f.target})`,
    `THREAT MODEL: ${c.threat}`,
    ``,
    `CANDIDATE FINDING:`,
    `  title: ${f.title}`,
    `  class: ${f.vuln_class} (${f.cwe || 'cwe?'})`,
    `  severity claimed: ${f.severity}`,
    `  file: ${f.file}:${f.line || '?'}`,
    `  source: ${f.source}`,
    `  sink: ${f.sink}`,
    `  data_flow: ${f.data_flow}`,
    `  excerpt: ${f.code_excerpt || '(none)'}`,
    ``,
  ]
  const lensText = {
    reachability: `LENS = REACHABILITY & CONTROL. Open the cited file and trace the path. Is the "source" genuinely attacker-controlled at the claimed privilege level in a real default deployment? Is the sink actually reached (not dead code, not gated behind admin-only/superuser, not disabled by default config)? Verify routing/registration. If the source is actually trusted (e.g., already-superuser, server-operator config not exposed to attackers) or the path is unreachable, set refuted=true.`,
    sanitization: `LENS = MITIGATION & SANITIZATION. Look specifically for defenses between source and sink: ORM parameterization, shlex.quote or list-form subprocess without shell=True, Django autoescape, HTML sanitizer allow-lists, URL/scheme allow-lists, SafeLoader, permission decorators, path normalization with containment checks, size/recursion limits. If an effective mitigation defeats the exploit, set refuted=true.`,
    repro: `LENS = CONCRETE EXPLOIT. Construct the precise input/request/payload that triggers the issue and state the resulting impact. If you cannot produce a plausible working exploit from the actual code (or it requires unrealistic preconditions), set refuted=true.`,
  }[lens]
  return [
    ...common,
    lensText,
    ``,
    `Set is_real=true ONLY if, after reading the code, the finding survives your lens. Provide reason and, if real, an exploit_sketch and adjusted_severity. Return ONLY the structured object.`,
  ].join('\n')
}

// ---------- FIND -> VERIFY pipeline (verify each cluster's findings as soon as it returns) ----------
const clusterResults = await pipeline(
  CLUSTERS,
  (c) => agent(finderPrompt(c), { label: `find:${c.key}`, phase: 'Find', schema: FINDINGS_SCHEMA }),
  (review, c) => {
    const findings = (review && review.findings) ? review.findings : []
    return parallel(findings.map((f) => () => {
      const heavy = f.severity === 'Critical' || f.severity === 'High'
      const lenses = heavy ? ['reachability', 'sanitization', 'repro'] : ['repro']
      return parallel(lenses.map((lens) => () =>
        agent(verifyPrompt(f, lens, c), { label: `verify:${c.key}:${lens}`, phase: 'Verify', schema: VERDICT_SCHEMA })
      )).then((votes) => {
        const v = votes.filter(Boolean)
        const real = v.filter((x) => x.is_real && !x.refuted).length
        const survives = v.length > 0 && real >= Math.ceil(v.length / 2)
        return { ...f, cluster: c.key, verifiers: v, votes_real: real, votes_total: v.length, survives }
      })
    }))
  }
)

const allCandidates = clusterResults.flat().filter(Boolean)
const confirmed = allCandidates.filter((f) => f.survives)
log(`Candidates: ${allCandidates.length} | survived verification: ${confirmed.length}`)

// ---------- SYNTHESIZE ----------
phase('Synthesize')
const synthInput = confirmed.map((f) => ({
  title: f.title, target: f.target, file: f.file, line: f.line, vuln_class: f.vuln_class,
  cwe: f.cwe, severity: f.severity, source: f.source, sink: f.sink, data_flow: f.data_flow,
  exploitability: f.exploitability, finder_confidence: f.confidence,
  votes: `${f.votes_real}/${f.votes_total}`,
  verifier_notes: (f.verifiers || []).map((v) => ({ real: v.is_real, refuted: v.refuted, sev: v.adjusted_severity, sketch: v.exploit_sketch, reason: v.reason })),
}))

const report = await agent([
  `You are the lead of a bug-bounty team. Below is JSON of security findings that already survived an adversarial 3-lens verification panel. Produce a prioritized, disclosure-ready report aimed at earning the highest-value bounties.`,
  ``,
  `INSTRUCTIONS:`,
  `- DEDUP / context: the Coinbase bare ssl.SSLContext() issue (CWE-295, websocket_base.py ~line 150) is ALREADY catalogued in our store as PY-SSL-001 and not yet submitted; if present, mark it "already-tracked" rather than novel, but keep it in the ranking.`,
  `- Rank by (severity x exploitability x program payout potential). Assign a CVSS:3.1 vector and confirm the severity bucket for each.`,
  `- Use web search to assess which of these projects run a PAYING bug-bounty program and rough payout tiers: Coinbase (HackerOne), Chia Network, Weblate. Put conclusions in program_scope_notes. If a tool is unavailable, reason from prior knowledge and say so.`,
  `- Be conservative and defensible: drop anything that reads as theoretical. It is fine to return few findings.`,
  `- For each finding give why_high_value, a concrete suggested_next_step (e.g., "write PoC X", "confirm scope on program Y", "add scanner rule Z"), and program_payout_note.`,
  `- recommended_priority_order: ordered list of finding titles for submission.`,
  ``,
  `FINDINGS JSON:`,
  JSON.stringify(synthInput, null, 2),
].join('\n'), { label: 'synthesize', phase: 'Synthesize', schema: REPORT_SCHEMA })

return {
  candidate_count: allCandidates.length,
  confirmed_count: confirmed.length,
  confirmed,
  report,
}
