export const meta = {
  name: 'chia-audit',
  description: 'Security audit of chia-blockchain high-value remote-reachable surface: P2P handlers, mempool/consensus, wallet RPC + offers, data_layer. Find -> adversarial verify -> rank.',
  phases: [
    { title: 'Find', detail: 'deep-read finders per remote-reachable subsystem' },
    { title: 'Verify', detail: 'adversarial refute-by-default panel' },
    { title: 'Synthesize', detail: 'rank by severity x reachability x program payout' },
  ],
}

const ROOT = `C:/bugBounty/targets/chia-blockchain`

const THREAT = [
  `THREAT MODEL (chia full node / wallet):`,
  `- HIGHEST value: an UNTRUSTED remote P2P peer sending crafted protocol messages to a full node (no auth; anyone can connect). Goal classes: remote DoS (unbounded alloc/CPU, decompression, infinite loop), consensus/validation bypass, memory/logic errors, peer-data injection.`,
  `- RPC clients: the wallet/full_node RPC and the daemon websocket. Sometimes reachable beyond localhost or cross-origin. Goal: missing/weak auth or origin checks, SSRF, parameter injection, command injection, key/secret disclosure.`,
  `- Wallet users / counterparties: offer/trade files and CATs/NFTs from other users. Goal: offer manipulation enabling fund theft, signature/spend-bundle validation gaps, integer/amount handling.`,
  `- data_layer HTTP server/clients. Goal: path traversal, SSRF, auth bypass, arbitrary file read/write.`,
  `Prefer findings reachable by a remote/untrusted actor with no or low privilege.`,
].join('\n')

const FINDINGS_SCHEMA = { type:'object', additionalProperties:false, properties:{
  findings:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{
    title:{type:'string'}, file:{type:'string'}, line:{type:'integer'}, vuln_class:{type:'string'}, cwe:{type:'string'},
    severity:{type:'string', enum:['Critical','High','Medium','Low','Info']},
    source:{type:'string'}, sink:{type:'string'}, data_flow:{type:'string'}, preconditions:{type:'string'},
    exploitability:{type:'string'}, confidence:{type:'number'}, code_excerpt:{type:'string'} },
    required:['title','file','vuln_class','severity','source','sink','data_flow','confidence'] } },
  coverage_notes:{type:'string'} }, required:['findings'] }

const VERDICT_SCHEMA = { type:'object', additionalProperties:false, properties:{
  is_real:{type:'boolean'}, refuted:{type:'boolean'}, reason:{type:'string'},
  attacker_controlled:{type:'boolean'}, sink_reachable:{type:'boolean'}, mitigation_present:{type:'boolean'},
  adjusted_severity:{type:'string'}, exploit_sketch:{type:'string'}, confidence:{type:'number'} },
  required:['is_real','refuted','reason','confidence'] }

const REPORT_SCHEMA = { type:'object', additionalProperties:false, properties:{
  executive_summary:{type:'string'},
  ranked_findings:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{
    rank:{type:'integer'}, title:{type:'string'}, file:{type:'string'}, line:{type:'integer'}, vuln_class:{type:'string'},
    cwe:{type:'string'}, severity:{type:'string'}, cvss_vector:{type:'string'}, why_high_value:{type:'string'},
    exploitability:{type:'string'}, program_payout_note:{type:'string'}, suggested_next_step:{type:'string'}, confidence:{type:'number'} },
    required:['rank','title','severity','why_high_value','suggested_next_step'] } },
  program_scope_notes:{type:'string'}, recommended_priority_order:{type:'array', items:{type:'string'}} },
  required:['executive_summary','ranked_findings'] }

const CLUSTERS = [
  { key:'fullnode-p2p', base:`${ROOT}/chia/full_node`,
    hint:'Full node P2P message handlers reachable by any peer. Read full_node_api.py (each @api_request handler) and full_node.py. Trace peer-supplied fields into processing. Hunt remote DoS (unbounded loops/allocations on peer input, missing size/rate limits), unvalidated peer data used in state, and exceptions that crash. Also weight_proof.py / sync logic if present.',
    classes:'remote DoS, peer-data injection, unhandled-exception crash, resource exhaustion' },
  { key:'mempool-consensus', base:`${ROOT}/chia/full_node`,
    hint:'Mempool + consensus validation. Read mempool_manager.py, mempool.py, and pull in chia/consensus/*.py (block_body_validation, blockchain, cost/fee logic). Hunt: spend-bundle/transaction validation gaps, fee/cost miscalculation, double-spend or replacement bugs, consensus rule that a crafted block/tx can bypass, integer overflow in amounts/cost.',
    classes:'consensus/validation bypass, double-spend, fee/cost manipulation, integer overflow' },
  { key:'wallet-rpc', base:`${ROOT}/chia/wallet`,
    hint:'Wallet RPC API. Read wallet_rpc_api.py in full and supporting wallet_state_manager.py. Hunt: endpoints lacking auth/validation, parameter injection, operations that move funds or sign without proper checks, key/mnemonic/secret disclosure through responses or logs, path/file params.',
    classes:'broken auth, key/secret disclosure, parameter injection, unsafe fund operation' },
  { key:'wallet-offers', base:`${ROOT}/chia/wallet/trading`,
    hint:'Offers/trades (cross-user financial data). Read offer.py, trade_manager.py, and CAT/NFT spend construction it relies on. Hunt: a malicious offer/trade file that validates but steals funds or mismatches amounts, missing checks on counterparty-supplied spend bundles, signature/announcement validation gaps, royalty/amount manipulation.',
    classes:'fund theft via crafted offer, spend-bundle validation gap, amount/royalty manipulation' },
  { key:'data-layer', base:`${ROOT}/chia/data_layer`,
    hint:'Data layer (DL) HTTP server/clients and store. Read data_layer.py, data_store.py, download_data/server files, dl_wallet if present. Hunt: path traversal in file/key handling, SSRF in URL fetch of remote DL data, auth bypass on the HTTP server, arbitrary file read/write, unsafe extraction.',
    classes:'path traversal, SSRF, broken auth, arbitrary file read/write' },
  { key:'rpc-daemon', base:`${ROOT}/chia/rpc`,
    hint:'RPC server core + daemon. Read chia/rpc/rpc_server.py, chia/rpc/util.py, chia/daemon/server.py, chia/daemon/keychain_server.py. Hunt (deeper than a surface pass): websocket/RPC origin & auth validation, whether the daemon can be driven by a local web page (CSWSH) or non-localhost client, command/argument injection when launching services/plotters, keychain access without authorization.',
    classes:'missing/weak auth, cross-site websocket hijack, command injection, keychain access bypass' },
  { key:'server-tls', base:`${ROOT}/chia/server`,
    hint:'P2P networking + TLS. Read server.py, ssl_context.py, ws_connection.py, node_discovery.py, address_manager.py, upnp.py, rate_limits*.py. Hunt: certificate/identity validation weaknesses (peer auth), message framing/size limits (DoS), peer-address handling, UPnP abuse, rate-limit bypass.',
    classes:'improper peer/cert validation, remote DoS, peer-address poisoning, rate-limit bypass' },
]

function finderPrompt(c){ return [
  `You are a senior security auditor reviewing the chia-blockchain node for its bug-bounty program. Rigorous, skeptical, concrete data-flow required. An earlier pass over daemon/server/rpc found nothing easy — go deeper.`,
  `REPO ROOT: ${ROOT}. PRIMARY DIR: ${c.base} (read relevant .py in full, recurse). Use Grep/Glob to follow handlers, decorators (@api_request), call chains, and the protocol message definitions in chia/protocols/*.`,
  ``, THREAT, ``,
  `CLUSTER FOCUS: ${c.hint}`,
  `CLASSES: ${c.classes}`,
  ``,
  `METHOD: find the dangerous operations; trace BACKWARD to an untrusted source (peer message field, RPC param, offer file, HTTP request); check for validation/limits/auth/mitigations in between; only report when a remote/low-priv actor can reach it. Severity = impact x reachability (remote unauth = highest).`,
  `At most 6 findings, best-first. Zero is an acceptable honest answer. Each: exact file:line, source, sink, concrete data_flow with function names, preconditions, exploitability, honest confidence in [0,1]. Return ONLY the structured object.`,
].join('\n') }

function verifyPrompt(f, lens){
  const head=[`Adversarial reviewer: REFUTE this candidate; default refuted=true unless solid. Read the real chia code at ${ROOT} first.`,``,
    `CANDIDATE: ${f.title}`, `class: ${f.vuln_class} (${f.cwe||'cwe?'}) severity: ${f.severity}`,
    `file: ${f.file}:${f.line||'?'}`, `source: ${f.source}`, `sink: ${f.sink}`, `data_flow: ${f.data_flow}`, `excerpt: ${f.code_excerpt||'(none)'}`, ``]
  const lensText={
    reachability:`LENS = REACHABILITY & CONTROL. Is the source truly reachable/controllable by an untrusted remote or low-priv actor in a default node config (peer connection accepted? RPC exposed/authless? handler actually registered)? Is the sink reached (not dead code, not gated behind operator-only config)? If trusted-only or unreachable, refuted=true.`,
    mitigation:`LENS = MITIGATION. Look for validation, size/rate limits, auth/origin checks, exception handling that contains impact, parameterization, allow-lists between source and sink. If an effective mitigation defeats it, refuted=true.`,
    repro:`LENS = CONCRETE EXPLOIT. Construct the exact message/request/offer and the resulting impact. If you cannot build a plausible exploit from the real code, refuted=true.`,
  }[lens]
  return [...head, lensText, ``, `is_real=true only if it survives against the real code. Provide exploit_sketch and adjusted_severity if real. Return ONLY the structured object.`].join('\n')
}

const results = await pipeline(CLUSTERS,
  (c)=>agent(finderPrompt(c),{label:`find:${c.key}`,phase:'Find',schema:FINDINGS_SCHEMA}),
  (review,c)=>{ const fs=(review&&review.findings)?review.findings:[]
    return parallel(fs.map((f)=>()=>{ const heavy=f.severity==='Critical'||f.severity==='High'
      const lenses=heavy?['reachability','mitigation','repro']:['repro']
      return parallel(lenses.map((l)=>()=>agent(verifyPrompt(f,l),{label:`verify:${c.key}:${l}`,phase:'Verify',schema:VERDICT_SCHEMA})))
        .then((votes)=>{ const v=votes.filter(Boolean); const real=v.filter(x=>x.is_real&&!x.refuted).length
          return {...f, cluster:c.key, verifiers:v, votes_real:real, votes_total:v.length, survives:v.length>0&&real>=Math.ceil(v.length/2)} }) })) })

const all = results.flat().filter(Boolean)
const confirmed = all.filter(f=>f.survives)
log(`chia candidates: ${all.length} | confirmed: ${confirmed.length}`)

phase('Synthesize')
const synthInput = confirmed.map(f=>({ title:f.title, file:f.file, line:f.line, vuln_class:f.vuln_class, cwe:f.cwe,
  severity:f.severity, source:f.source, sink:f.sink, data_flow:f.data_flow, exploitability:f.exploitability,
  votes:`${f.votes_real}/${f.votes_total}`,
  verifier_notes:(f.verifiers||[]).map(v=>({real:v.is_real,refuted:v.refuted,reachable:v.attacker_controlled,mitig:v.mitigation_present,sev:v.adjusted_severity,sketch:v.exploit_sketch,reason:v.reason})) }))

const report = await agent([
  `You are a bug-bounty lead reporting to the Chia Network program (HackerOne). Findings below survived an adversarial panel. Produce a prioritized, payout-aware report.`, ``,
  `INSTRUCTIONS: rank by severity x reachability x payout. Assign CVSS:3.1 vectors. Use web search to confirm the Chia Network HackerOne program is active and its rough payout tiers; put conclusions in program_scope_notes (say if a tool is unavailable). Be conservative and defensible; if empty, record the null result and name the deepest areas to revisit. For each finding give why_high_value, a concrete suggested_next_step (PoC/repro), and program_payout_note.`, ``,
  `FINDINGS JSON:`, JSON.stringify(synthInput,null,2),
].join('\n'), {label:'synthesize', phase:'Synthesize', schema:REPORT_SCHEMA})

return { candidate_count:all.length, confirmed_count:confirmed.length, confirmed, report }
