export const meta = {
  name: 'cbmpc-deep-mpecdsa-pve',
  description: 'Deep second-pass cb-mpc audit narrowed to mp-ECDSA DKG/signing message validation and PVE verification soundness',
  phases: [
    { title: 'Find', detail: 'exhaustive received-value validation finders' },
    { title: 'Verify', detail: 'adversarial reachability/check-present/attack panel' },
    { title: 'Synthesize', detail: 'rank by bounty tier' },
  ],
}

const ROOT = `C:/bugBounty/targets/cb-mpc`
const SCOPE = `BOUNTY SCOPE: eligible only if reachable via public APIs in include/cbmpc/api/. demo-* and include/cbmpc/c_api/* are OUT OF SCOPE as entry points. Primitive/ZK bugs eligible only when tied to a named public-API path. Medium+ needs an independent-parties PoC (>=1 honest party on unmodified code; malicious party interacts only through the public protocol boundary). Tiers: Critical $50k (key compromise/RCE), High $15k, Medium $2k, Low $200.`

const FINDINGS_SCHEMA = { type:'object', additionalProperties:false, properties:{
  findings:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{
    title:{type:'string'}, public_api_entry:{type:'string'}, file:{type:'string'}, line:{type:'integer'},
    vuln_class:{type:'string'}, severity:{type:'string', enum:['Critical','High','Medium','Low','Info']},
    attacker_role:{type:'string'}, missing_check:{type:'string'}, data_flow:{type:'string'},
    impact:{type:'string'}, poc_sketch:{type:'string'}, confidence:{type:'number'}, code_excerpt:{type:'string'} },
    required:['title','public_api_entry','file','vuln_class','severity','missing_check','data_flow','impact','confidence'] } },
  coverage_notes:{type:'string'} }, required:['findings'] }

const VERDICT_SCHEMA = { type:'object', additionalProperties:false, properties:{
  is_real:{type:'boolean'}, refuted:{type:'boolean'}, reason:{type:'string'},
  reachable_via_public_api:{type:'boolean'}, check_actually_present_elsewhere:{type:'boolean'},
  intended_design:{type:'boolean'}, adjusted_severity:{type:'string'}, attack_at_boundary:{type:'string'}, confidence:{type:'number'} },
  required:['is_real','refuted','reason','confidence'] }

const REPORT_SCHEMA = { type:'object', additionalProperties:false, properties:{
  executive_summary:{type:'string'},
  ranked_findings:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{
    rank:{type:'integer'}, title:{type:'string'}, public_api_entry:{type:'string'}, file:{type:'string'}, line:{type:'integer'},
    vuln_class:{type:'string'}, severity:{type:'string'}, bounty_tier:{type:'string'}, est_reward:{type:'string'},
    why:{type:'string'}, poc_required:{type:'boolean'}, suggested_next_step:{type:'string'}, confidence:{type:'number'} },
    required:['rank','title','severity','why','suggested_next_step'] } },
  coverage_and_caveats:{type:'string'}, recommended_priority_order:{type:'array', items:{type:'string'}} },
  required:['executive_summary','ranked_findings'] }

const CLUSTERS = [
  { key:'mpecdsa-dkg', focus:'Multi-party ECDSA distributed key generation. Read src/cbmpc/protocol/ecdsa_mp.cpp and src/cbmpc/protocol/ec_dkg.cpp IN FULL. Enumerate EVERY value a party receives from a counterparty during DKG (commitments, shares, public points, ZK proofs, Paillier keys/ciphertexts). For each, state precisely whether and where it is validated before use (commitment opened+bound? point on-curve/in-subgroup/not identity? share consistent with public commitment / Feldman-VSS check? ZK proof verified against the correct statement? Paillier modulus well-formed / proven?). Flag any received value used without its required check, exploitable by one malicious party with honest others.', api:'ecdsa_mp.h' },
  { key:'mpecdsa-sign', focus:'Multi-party ECDSA signing rounds. Read src/cbmpc/protocol/ecdsa_mp.cpp signing path IN FULL. Enumerate every received value per signing round (nonce commitments, MtA messages/ciphertexts, partial signatures, ZK/range proofs). Check nonce-share handling for bias/reuse, MtA range-proof verification, consistency checks tying partial sigs to committed shares. Hunt for a malicious signer recovering an honest party share or biasing/forging.', api:'ecdsa_mp.h' },
  { key:'mpecdsa-zk', focus:'The ZK proofs CONSUMED by the mp-ECDSA DKG/signing path. From ecdsa_mp.cpp/ec_dkg.cpp identify which proofs are used (likely zk_paillier range/correctness, zk_ec discrete-log, pedersen). Read those in src/cbmpc/zk/*.cpp IN FULL. Verify: is the Fiat-Shamir challenge bound to the FULL statement+transcript (incl. session id / party ids / public params)? Soundness error acceptable? Is verify() actually invoked with the right public statement at every consumption site (not a self-supplied one)? Proof malleability/replay across sessions?', api:'ecdsa_mp.h (proofs reachable from signing/DKG)' },
  { key:'pve-soundness', focus:'Publicly Verifiable Encryption verification soundness. Read src/cbmpc/protocol/pve.cpp, pve_base.cpp, pve_batch.cpp IN FULL plus include/cbmpc/api/pve_base_pke.h and pve_batch_single_recipient.h. Core question: can a malicious encryptor craft (ciphertext, proof) that PASSES verification but decrypts to a DIFFERENT or zero/garbage plaintext than committed (soundness break => key-backup/escrow exposure or loss)? Check binding between the verified statement and what decryption actually returns, and completeness of the proof checks.', api:'pve_base_pke.h, pve_batch_single_recipient.h' },
  { key:'pve-ac-elgamal', focus:'Access-structure PVE and ElGamal. Read src/cbmpc/protocol/pve_ac.cpp and src/cbmpc/crypto/elgamal.cpp IN FULL plus include/cbmpc/api/pve_batch_ac.h. Check ElGamal ciphertext validation (point on-curve/subgroup), the access-structure/threshold reconstruction for soundness, and whether a malicious party can make verification pass while decryption under the access structure yields the wrong secret.', api:'pve_batch_ac.h' },
  { key:'mpecdsa-serial', focus:'Deserialization of mp-ECDSA / PVE protocol messages from an untrusted counterparty. From the protocol files trace how received messages are parsed (src/cbmpc/core/convert.cpp, buf*.cpp and any per-message deserialize). Hunt missing length/bounds checks, integer overflow, OOB reads, identity/zero points accepted, that lead to crash (Low) or memory corruption / logic bypass (higher) reachable from a public-API round.', api:'ecdsa_mp.h, pve_*.h message round-trips' },
]

function finderPrompt(c){ return [
  `You are a senior applied cryptographer doing a DEEP second-pass audit of Coinbase cb-mpc. A first broad pass found nothing; go deeper and more exhaustive on this narrow surface. Rigor over volume.`,
  `REPO ROOT: ${ROOT}. Read the named files IN FULL; follow into include/cbmpc/** and include-internal/** for definitions. Anchor every finding to a public API entry (${c.api}).`,
  ``, SCOPE, ``,
  `SURFACE: ${c.focus}`,
  ``,
  `Build an explicit mental table: received-value -> is it validated? where? if not, attack. Report ONLY values used without a required check that a malicious party can exploit with honest counterparties on unmodified code.`,
  `At most 5 findings, best-first; ZERO is a fully acceptable, honest result. Each finding: public_api_entry, exact file:line, the precise missing_check, data_flow with function names, attacker_role, impact, poc_sketch through the public API, honest confidence in [0,1].`,
  `In coverage_notes, briefly list the received values you DID confirm are properly validated (evidence the pass was thorough). Return ONLY the structured object.`,
].join('\n') }

function verifyPrompt(f, lens){
  const head=[`Adversarial cryptography reviewer: REFUTE this candidate; default refuted=true unless solid. Read the real cb-mpc code at ${ROOT} first.`,``,
    `CANDIDATE: ${f.title}`, `api: ${f.public_api_entry}`, `class: ${f.vuln_class} severity: ${f.severity}`,
    `file: ${f.file}:${f.line||'?'}`, `missing_check: ${f.missing_check}`, `data_flow: ${f.data_flow}`,
    `attacker_role: ${f.attacker_role||'?'}`, `impact: ${f.impact}`, `excerpt: ${f.code_excerpt||'(none)'}`, ``]
  const lensText={
    reachability:`LENS = PUBLIC-API REACHABILITY. Trace that the code is reached from include/cbmpc/api/ (not only demos/c_api). If not, refuted=true, reachable_via_public_api=false.`,
    check_present:`LENS = IS THE CHECK ACTUALLY MISSING? Search callers, same function, helpers, include-internal for the claimed-missing verification (ZK verify, commitment open, on-curve/subgroup, range, length bound). If present anywhere on the path, check_actually_present_elsewhere=true and refuted=true. Decide if it is intended documented design.`,
    attack:`LENS = CONCRETE BOUNDARY ATTACK. Construct the exact malicious-party deviation through the public API and the concrete impact (which secret/forgery/DoS). Honest party runs unmodified code. If no plausible attack, refuted=true.`,
  }[lens]
  return [...head, lensText, ``, `is_real=true only if it survives against the real code. Return ONLY the structured object.`].join('\n')
}

const results = await pipeline(CLUSTERS,
  (c)=>agent(finderPrompt(c),{label:`find:${c.key}`,phase:'Find',schema:FINDINGS_SCHEMA}),
  (review,c)=>{ const fs=(review&&review.findings)?review.findings:[]
    return parallel(fs.map((f)=>()=>{ const lenses=['reachability','check_present','attack']
      return parallel(lenses.map((l)=>()=>agent(verifyPrompt(f,l),{label:`verify:${c.key}:${l}`,phase:'Verify',schema:VERDICT_SCHEMA})))
        .then((votes)=>{ const v=votes.filter(Boolean); const real=v.filter(x=>x.is_real&&!x.refuted).length
          return {...f, cluster:c.key, verifiers:v, votes_real:real, votes_total:v.length, survives:v.length>0&&real>=Math.ceil(v.length/2)} }) })) })

const all = results.flat().filter(Boolean)
const confirmed = all.filter(f=>f.survives)
log(`deep cb-mpc candidates: ${all.length} | confirmed: ${confirmed.length}`)

phase('Synthesize')
const synthInput = confirmed.map(f=>({ title:f.title, public_api_entry:f.public_api_entry, file:f.file, line:f.line,
  vuln_class:f.vuln_class, severity:f.severity, missing_check:f.missing_check, data_flow:f.data_flow, impact:f.impact,
  poc_sketch:f.poc_sketch, votes:`${f.votes_real}/${f.votes_total}`,
  verifier_notes:(f.verifiers||[]).map(v=>({real:v.is_real,refuted:v.refuted,reachable:v.reachable_via_public_api,check_present:v.check_actually_present_elsewhere,intended:v.intended_design,attack:v.attack_at_boundary,reason:v.reason})) }))

const report = await agent([
  `Crypto bug-bounty lead reporting to Coinbase cb-mpc. Findings below survived a 3-lens adversarial panel. Produce a bounty-aware ranked report.`, ``, SCOPE, ``,
  `Map each to a tier + est_reward; set poc_required=true for Medium+ and describe the minimal independent-parties PoC via include/cbmpc/api/ only. Be conservative; if empty, record the null result and name the deepest-uncertainty spots. coverage_and_caveats required.`, ``,
  `FINDINGS JSON:`, JSON.stringify(synthInput,null,2),
].join('\n'), {label:'synthesize', phase:'Synthesize', schema:REPORT_SCHEMA})

return { candidate_count:all.length, confirmed_count:confirmed.length, confirmed, report }
