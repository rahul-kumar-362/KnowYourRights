export const meta = {
  name: 'cbmpc-crypto-audit',
  description: 'Cryptographic security audit of coinbase/cb-mpc MPC library: deep-read finders anchored to in-scope public APIs, adversarial verification, ranked synthesis by bounty tier',
  phases: [
    { title: 'Find', detail: 'deep crypto/protocol finders per public-API family' },
    { title: 'Verify', detail: 'adversarial panel: reachability, intended-design, protocol-boundary attack' },
    { title: 'Synthesize', detail: 'rank by cb-mpc bounty tier; PoC-reachability gate' },
  ],
}

const ROOT = `C:/bugBounty/targets/cb-mpc`

const SCOPE = [
  `BOUNTY SCOPE (cb-mpc) — read carefully:`,
  `- ELIGIBLE only if the vulnerability is reachable through the SUPPORTED PUBLIC APIs in include/cbmpc/api/ (e.g. signing, DKG, TDH2, PVE, Schnorr/EdDSA).`,
  `- For Medium+ a PoC must trigger the issue THROUGH those public APIs (parties run independently; >=1 honest party uses unmodified code; the malicious party interacts ONLY through the public protocol boundary).`,
  `- OUT OF SCOPE: demo-* directories, and the C API headers under include/cbmpc/c_api/*. Do NOT report issues whose only entry point is demos or c_api.`,
  `- Low-level primitive bugs (ZKPs, commitments, Paillier, secret sharing) ARE eligible WHEN reachable from the in-scope protocols — you must name the public-API path that reaches them.`,
  `- Tiers: Critical $50k (key compromise / RCE / key-material disclosure, easily exploitable), High $15k (serious but less easily exploitable), Medium $2k (hard/limited, demonstrable via public API), Low $200 (non-crypto crashes, deprecated code).`,
].join('\n')

const THREATS = [
  `MPC/threshold-crypto vulnerability classes to hunt (malicious-participant model):`,
  `- A participating party deviating from the protocol to extract another party's key share or the full key.`,
  `- Missing/!incorrect verification of values RECEIVED from a counterparty (ZK proofs not checked, commitments not opened/bound, range proofs skipped, subgroup/point-on-curve checks missing, Paillier ciphertext/range checks missing).`,
  `- Fiat-Shamir / non-interactive ZK flaws: challenge not bound to the full transcript/statement (weak transcript), reusable challenges, malleable proofs, missing domain separation in the random oracle.`,
  `- Nonce/randomness defects in ECDSA/Schnorr/EdDSA: biased or reused nonces, predictable DRBG, k derived from insufficient entropy, leakage enabling lattice key recovery.`,
  `- Soundness gaps where a protocol secure against semi-honest adversaries is exposed at a malicious boundary without the needed checks; identifiable-abort / abort-handling that leaks secret-dependent info.`,
  `- Modular-arithmetic / bignum errors, incorrect CRT, Paillier decryption-share issues, Lagrange/secret-sharing reconstruction errors enabling share recovery.`,
  `- Deserialization of untrusted protocol messages: missing length/bounds checks, integer overflow, memory unsafety reachable from a public-API protocol round.`,
].join('\n')

const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    findings: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: {
        title: { type: 'string' },
        public_api_entry: { type: 'string', description: 'the include/cbmpc/api/*.h function/path that reaches this' },
        file: { type: 'string' }, line: { type: 'integer' },
        vuln_class: { type: 'string' },
        severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low', 'Info'] },
        attacker_role: { type: 'string', description: 'which party/role the attacker plays at the protocol boundary' },
        missing_check: { type: 'string', description: 'the specific verification/bound that is absent or wrong' },
        data_flow: { type: 'string', description: 'public API -> protocol round -> vulnerable code, with function names' },
        impact: { type: 'string' },
        poc_sketch: { type: 'string', description: 'how a PoC through the public API would trigger it' },
        confidence: { type: 'number' },
        code_excerpt: { type: 'string' },
      },
      required: ['title', 'public_api_entry', 'file', 'vuln_class', 'severity', 'missing_check', 'data_flow', 'impact', 'confidence'],
    } },
    coverage_notes: { type: 'string' },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    is_real: { type: 'boolean' }, refuted: { type: 'boolean' }, reason: { type: 'string' },
    reachable_via_public_api: { type: 'boolean' },
    check_actually_present_elsewhere: { type: 'boolean', description: 'true if the "missing" check is in fact performed in another function/caller' },
    intended_design: { type: 'boolean', description: 'true if this is documented/intended protocol behavior, not a bug' },
    adjusted_severity: { type: 'string' }, attack_at_boundary: { type: 'string' }, confidence: { type: 'number' },
  },
  required: ['is_real', 'refuted', 'reason', 'confidence'],
}

const REPORT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    executive_summary: { type: 'string' },
    ranked_findings: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: {
        rank: { type: 'integer' }, title: { type: 'string' }, public_api_entry: { type: 'string' },
        file: { type: 'string' }, line: { type: 'integer' }, vuln_class: { type: 'string' },
        severity: { type: 'string' }, bounty_tier: { type: 'string' }, est_reward: { type: 'string' },
        why: { type: 'string' }, poc_required: { type: 'boolean' }, suggested_next_step: { type: 'string' }, confidence: { type: 'number' },
      },
      required: ['rank', 'title', 'severity', 'why', 'suggested_next_step'],
    } },
    coverage_and_caveats: { type: 'string' },
    recommended_priority_order: { type: 'array', items: { type: 'string' } },
  },
  required: ['executive_summary', 'ranked_findings'],
}

const CLUSTERS = [
  { key: 'ecdsa-2p', api: 'include/cbmpc/api/ecdsa_2p.h, include/cbmpc/api/hd_keyset_ecdsa_2p.h',
    impl: 'src/cbmpc/protocol/ecdsa_2p.cpp, src/cbmpc/protocol/hd_keyset_ecdsa_2p.cpp',
    focus: 'Two-party ECDSA: DKG, signing, key refresh, HD derivation. MtA/Paillier interaction, nonce handling, ZK proof checks on counterparty values, key-share extraction by a malicious party.' },
  { key: 'ecdsa-mp', api: 'include/cbmpc/api/ecdsa_mp.h',
    impl: 'src/cbmpc/protocol/ecdsa_mp.cpp, src/cbmpc/protocol/ec_dkg.cpp',
    focus: 'Multi-party threshold ECDSA + EC DKG. Distributed key generation soundness, threshold signing, malicious party deviating to recover shares or bias the key, verification of broadcast/P2P values.' },
  { key: 'eddsa-schnorr', api: 'include/cbmpc/api/eddsa_2p.h, eddsa_mp.h, schnorr_2p.h, schnorr_mp.h',
    impl: 'src/cbmpc/protocol/eddsa.cpp, src/cbmpc/protocol/schnorr_2p.cpp, src/cbmpc/protocol/schnorr_mp.cpp',
    focus: 'EdDSA/Schnorr 2p + mp. Nonce derivation and commitment, Fiat-Shamir challenge binding, k reuse/bias, missing checks on received commitments/shares.' },
  { key: 'tdh2', api: 'include/cbmpc/api/tdh2.h',
    impl: 'src/cbmpc/crypto/tdh2.cpp',
    focus: 'TDH2 threshold encryption/decryption. Decryption-share validity proofs, CCA robustness, share verification, malformed-ciphertext handling.' },
  { key: 'pve', api: 'include/cbmpc/api/pve_base_pke.h, pve_batch_ac.h, pve_batch_single_recipient.h',
    impl: 'src/cbmpc/protocol/pve.cpp, pve_ac.cpp, pve_base.cpp, pve_batch.cpp, src/cbmpc/crypto/elgamal.cpp',
    focus: 'Publicly Verifiable Encryption (key backup/escrow). Soundness of the verifiable-encryption proof, whether a cheating encryptor can produce a passing proof for an undecryptable/wrong plaintext, ElGamal handling.' },
  { key: 'zk', api: 'reachable from the above protocols (name which)',
    impl: 'src/cbmpc/zk/fischlin.cpp, zk_ec.cpp, zk_paillier.cpp, zk_pedersen.cpp, zk_unknown_order.cpp, zk_elgamal_com.cpp, small_primes.cpp',
    focus: 'Zero-knowledge proof systems. Fiat-Shamir transcript/statement binding, challenge-space and soundness-error, Fischlin transform correctness, missing range/membership checks, proof malleability. Tie each issue to the protocol (DKG/signing/PVE/TDH2) that consumes the proof.' },
  { key: 'primitives', api: 'reachable from the above protocols (name which)',
    impl: 'src/cbmpc/crypto/drbg.cpp, ro.cpp, secret_sharing.cpp, lagrange.cpp, base_mod.cpp, base_paillier.cpp, base_ecc.cpp, base_ec_core.cpp, base_ecc_secp256k1.cpp',
    focus: 'Core primitives: DRBG/randomness quality and seeding, random-oracle/domain-separation, Shamir secret sharing + Lagrange reconstruction, modular arithmetic, Paillier, EC point validation (on-curve/subgroup). Bugs eligible only when a protocol path reaches them.' },
  { key: 'serialization', api: 'all api/*.h message round-trips',
    impl: 'src/cbmpc/core/convert.cpp, buf.cpp, buf128.cpp, buf256.cpp, and (de)serialization paths in src/cbmpc/protocol/*',
    focus: 'Deserialization of untrusted protocol messages received from a counterparty: missing length/bounds checks, integer overflow, out-of-bounds, type confusion, memory unsafety reachable from a public-API protocol round.' },
]

function finderPrompt(c) {
  return [
    `You are a senior applied-cryptographer auditing Coinbase's open-source MPC library cb-mpc for its bug-bounty program. Be rigorous, skeptical, and precise; a wrong crypto claim is worse than none.`,
    ``,
    `REPO ROOT: ${ROOT}`,
    `IN-SCOPE PUBLIC API HEADERS for this cluster: ${c.api}`,
    `IMPLEMENTATION TO AUDIT: ${c.impl}`,
    `Read these files in FULL. Use Grep/Glob to follow into include/cbmpc/**, include-internal/** (allowed for root-cause analysis), and helpers. Read the corresponding public API header to anchor every finding to a real entry point.`,
    ``,
    SCOPE,
    ``,
    THREATS,
    ``,
    `CLUSTER FOCUS: ${c.focus}`,
    ``,
    `METHOD:`,
    `1. Read the public API header(s) to learn the supported entry points and the malicious-party boundary.`,
    `2. Read the implementation. For each value a party RECEIVES from a counterparty, ask: is it verified before use (ZK proof checked? commitment bound? range/subgroup/on-curve checked? length bounded?). A missing or incorrect check that a malicious party can exploit is the prize.`,
    `3. For ZK/primitive issues, trace the path from a public-API protocol call down to the primitive, and name it.`,
    `4. Reject non-issues: checks performed in a caller, intended semi-honest-only helpers not exposed maliciously, documented assumptions.`,
    ``,
    `RULES:`,
    `- Only report issues reachable via the in-scope public APIs. Ignore demo-* and c_api.`,
    `- Quality over quantity: at most 5 findings, best-first. Zero is an honest answer for a well-audited library.`,
    `- Each finding: the public_api_entry, exact file:line, the specific missing_check, the data_flow with function names, the malicious attacker_role, impact, and a poc_sketch through the public API.`,
    `- Calibrate severity to the bounty tiers. Be honest with confidence in [0,1].`,
    `Return ONLY the structured object.`,
  ].join('\n')
}

function verifyPrompt(f, lens) {
  const head = [
    `You are an adversarial cryptography reviewer. REFUTE the candidate finding below; default to refuted=true unless the evidence is solid. Read the actual cb-mpc code (root ${ROOT}) before deciding.`,
    ``,
    `CANDIDATE:`,
    `  title: ${f.title}`,
    `  public API entry: ${f.public_api_entry}`,
    `  class: ${f.vuln_class}  severity: ${f.severity}`,
    `  file: ${f.file}:${f.line || '?'}`,
    `  missing/incorrect check: ${f.missing_check}`,
    `  data flow: ${f.data_flow}`,
    `  attacker role: ${f.attacker_role || '?'}`,
    `  impact: ${f.impact}`,
    `  excerpt: ${f.code_excerpt || '(none)'}`,
    ``,
  ]
  const lensText = {
    reachability: `LENS = PUBLIC-API REACHABILITY. Confirm the vulnerable code is actually reached through an in-scope public API in include/cbmpc/api/ (not only via demos or include/cbmpc/c_api/*). Trace the call path. If it is only reachable from out-of-scope entry points, or not reached at all, set refuted=true and reachable_via_public_api=false.`,
    check_present: `LENS = IS THE CHECK ACTUALLY MISSING? The finding claims a verification is absent. Search the callers, the same function, helper utilities, and include-internal for the check (ZK verify, commitment open, range/subgroup/on-curve test, length bound). If the check is in fact performed anywhere on the path, set check_actually_present_elsewhere=true and refuted=true. Also decide if this is INTENDED protocol design (documented assumption) rather than a bug.`,
    attack: `LENS = CONCRETE PROTOCOL-BOUNDARY ATTACK. Construct the precise malicious-party deviation through the public API that exploits this, and the concrete impact (what secret/forgery/DoS results). Honest party runs unmodified code. If you cannot construct a plausible attack consistent with the protocol, set refuted=true.`,
  }[lens]
  return [...head, lensText, ``, `Set is_real=true only if the finding survives your lens against the real code. Return ONLY the structured object.`].join('\n')
}

const clusterResults = await pipeline(
  CLUSTERS,
  (c) => agent(finderPrompt(c), { label: `find:${c.key}`, phase: 'Find', schema: FINDINGS_SCHEMA }),
  (review, c) => {
    const findings = (review && review.findings) ? review.findings : []
    return parallel(findings.map((f) => () => {
      const heavy = f.severity === 'Critical' || f.severity === 'High' || f.severity === 'Medium'
      const lenses = heavy ? ['reachability', 'check_present', 'attack'] : ['attack']
      return parallel(lenses.map((lens) => () =>
        agent(verifyPrompt(f, lens), { label: `verify:${c.key}:${lens}`, phase: 'Verify', schema: VERDICT_SCHEMA })
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
log(`cb-mpc candidates: ${allCandidates.length} | survived verification: ${confirmed.length}`)

phase('Synthesize')
const synthInput = confirmed.map((f) => ({
  title: f.title, public_api_entry: f.public_api_entry, file: f.file, line: f.line,
  vuln_class: f.vuln_class, severity: f.severity, missing_check: f.missing_check,
  data_flow: f.data_flow, impact: f.impact, poc_sketch: f.poc_sketch, finder_confidence: f.confidence,
  votes: `${f.votes_real}/${f.votes_total}`,
  verifier_notes: (f.verifiers || []).map((v) => ({ real: v.is_real, refuted: v.refuted, reachable: v.reachable_via_public_api, check_present: v.check_actually_present_elsewhere, intended: v.intended_design, attack: v.attack_at_boundary, reason: v.reason })),
}))

const report = await agent([
  `You are the lead of a crypto bug-bounty team reporting to Coinbase's cb-mpc program. Below are findings that survived an adversarial 3-lens panel. Produce a prioritized, bounty-aware report.`,
  ``,
  SCOPE,
  ``,
  `INSTRUCTIONS:`,
  `- Map each finding to a cb-mpc bounty tier (Critical $50k / High $15k / Medium $2k / Low $200) and give est_reward.`,
  `- Flag poc_required=true for Medium+ (the program requires a public-API PoC with independent parties). For those, suggested_next_step should describe the minimal PoC harness using only include/cbmpc/api/.`,
  `- Be conservative: cb-mpc is a professionally audited library; prefer fewer, defensible findings. If nothing is solid, say so plainly and recommend the deeper-dive areas instead of padding.`,
  `- coverage_and_caveats: what was examined, what remains uncertain, and which areas merit a manual expert pass.`,
  ``,
  `FINDINGS JSON:`,
  JSON.stringify(synthInput, null, 2),
].join('\n'), { label: 'synthesize', phase: 'Synthesize', schema: REPORT_SCHEMA })

return { candidate_count: allCandidates.length, confirmed_count: confirmed.length, confirmed, report }
