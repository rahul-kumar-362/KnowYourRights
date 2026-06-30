export const meta = {
  name: 'scrodinger-chess-curriculum',
  description: 'Research, verify, and synthesize a personalized chess-improvement curriculum for Scrodinger (FIDE ~1700)',
  phases: [
    { title: 'Research', detail: 'parallel web research across 12 resource categories, personalized to profile' },
    { title: 'Verify', detail: 'adversarially verify each resource exists, is current, and is well-regarded' },
    { title: 'Synthesize', detail: 'curate essential stack, map to phases, build weekly integration plan' },
  ],
}

// ---- Player profile (personalization context injected into every agent) ----
const PROFILE = `
PLAYER: "Scrodinger" (multiple accounts).
RATINGS: chess.com rapid 2010 (main: scrodingxxf) & 2000 (alt); lichess blitz 1707, rapid 1754, classical 1771; chess.com blitz best 1612, currently lower; bullet ~1150.
TACTICS/PUZZLES: chess.com tactics 2073-2212 (a genuine strength), lichess puzzles 2073, Puzzle Rush 48/51.
ESTIMATED FIDE OTB: ~1600-1700. Has NOT played FIDE-rated OTB yet.
REPERTOIRE — White: 1.e4 player. vs 1...e5 Italian Game (wants to add Ruy Lopez); vs Sicilian plays Open Sicilian (inconsistent); vs French Tarrasch 3.Nd2; vs Caro-Kann Advance 3.e5.
REPERTOIRE — Black: vs 1.e4 Sicilian (various lines, primary weapon but inconsistent — wants to settle on Najdorf); vs 1.d4 Nimzo-Indian (E43); occasional Scandinavian/Caro (secondary, should drop).
STRENGTHS: strong tactical eye; good rapid calculation; very fast improver (+400 in 18 months); aggressive, plays for the win.
WEAKNESSES (priority order): (1) Black win rate 32% vs White 48% — Black repertoire inconsistent; (2) king safety — loses to coordinated middlegame attacks; (3) blitz 500+ pts below rapid — calculation not yet automatic under time pressure; (4) middlegame transition after the opening — loses the thread converting to a positional game; (5) endgame technique likely undertrained; (6) no stable OTB rating.
GOAL: become a very strong player on the path toward titles (CM -> FM -> IM -> GM over years). Wants a personalized course/resource curriculum.
`

// ---- Shared resource schema ----
const RESOURCE_PROPS = {
  name:     { type: 'string', description: 'Exact title of the book/course/channel/tool' },
  rtype:    { type: 'string', description: 'One of: Book | Online Course | Video Series | YouTube Channel | Platform | Software/Tool | Coaching/Program' },
  provider: { type: 'string', description: 'Author or platform/provider (e.g. Chessable, Quality Chess, Saint Louis Chess Club)' },
  url:      { type: 'string', description: 'Direct official URL to the resource (best-known canonical link)' },
  cost:     { type: 'string', description: 'Price or pricing model, with currency. Use "Free" if free.' },
  level:    { type: 'string', description: 'Rating range this best suits, e.g. "1600-2200" or "1800+"' },
  why:      { type: 'string', description: 'Specific, personalized reason this fits Scrodinger — tie it to a named strength/weakness/repertoire item from the profile' },
  priority: { type: 'string', enum: ['Essential', 'Recommended', 'Optional'] },
  time:     { type: 'string', description: 'Rough time commitment, e.g. "20-30 hrs", "ongoing daily", "1 book ~3 months"' },
}

const RESEARCH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['category', 'resources'],
  properties: {
    category: { type: 'string' },
    resources: {
      type: 'array', minItems: 5, maxItems: 14,
      items: {
        type: 'object', additionalProperties: false,
        required: ['name','rtype','provider','url','cost','level','why','priority','time'],
        properties: RESOURCE_PROPS,
      },
    },
  },
}

const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['category', 'resources'],
  properties: {
    category: { type: 'string' },
    resources: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name','rtype','provider','url','cost','level','why','priority','time','verified','confidence','note'],
        properties: {
          ...RESOURCE_PROPS,
          verified:   { type: 'boolean', description: 'true only if you confirmed via web search that this resource really exists and is accurately described' },
          confidence: { type: 'string', enum: ['high','medium','low'] },
          note:       { type: 'string', description: 'verification note: what you confirmed/corrected, or reason for dropping confidence' },
        },
      },
    },
  },
}

const SYNTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['essential_stack','phase_mapping','weekly_integration','weakness_fixes','gaps','headline'],
  properties: {
    headline: { type: 'string', description: 'One punchy sentence summarizing the curriculum philosophy for Scrodinger' },
    essential_stack: {
      type: 'array', minItems: 8, maxItems: 16,
      description: 'The non-negotiable core resources, ranked. The stuff to buy/start first.',
      items: {
        type: 'object', additionalProperties: false,
        required: ['rank','name','provider','rtype','cost','why'],
        properties: {
          rank: { type: 'integer' },
          name: { type: 'string' }, provider: { type: 'string' }, rtype: { type: 'string' },
          cost: { type: 'string' }, why: { type: 'string' },
        },
      },
    },
    phase_mapping: {
      type: 'array', minItems: 3, maxItems: 4,
      description: 'Which resources to use in each roadmap phase',
      items: {
        type: 'object', additionalProperties: false,
        required: ['phase','focus','resources'],
        properties: {
          phase: { type: 'string', description: 'e.g. "Phase 1 — Foundation (Months 1-6)"' },
          focus: { type: 'string' },
          resources: { type: 'array', items: { type: 'string' }, description: 'resource names assigned to this phase with a 3-6 word note each' },
        },
      },
    },
    weakness_fixes: {
      type: 'array', minItems: 4, maxItems: 6,
      description: 'Map each named weakness to the specific resources that fix it',
      items: {
        type: 'object', additionalProperties: false,
        required: ['weakness','resources','method'],
        properties: {
          weakness: { type: 'string' },
          resources: { type: 'array', items: { type: 'string' } },
          method: { type: 'string', description: 'how to actually use them to fix this weakness' },
        },
      },
    },
    weekly_integration: {
      type: 'array', minItems: 5, maxItems: 8,
      description: 'A weekly study template slotting resources into days/blocks',
      items: {
        type: 'object', additionalProperties: false,
        required: ['block','activity','resource','duration'],
        properties: {
          block: { type: 'string' }, activity: { type: 'string' },
          resource: { type: 'string' }, duration: { type: 'string' },
        },
      },
    },
    gaps: { type: 'array', items: { type: 'string' }, description: 'Anything the research did not cover that Scrodinger still needs' },
  },
}

// ---- 12 research dimensions ----
const DIMENSIONS = [
  { key: 'white-rep', title: 'White Repertoire Courses',
    prompt: `Find the best courses/books/video series for Scrodinger's WHITE repertoire as a 1.e4 player aiming for 2000-2300+. Cover: Ruy Lopez AND/OR Italian (vs 1...e5), the Open Sicilian (his main need — he plays it inconsistently), French Tarrasch (3.Nd2), Caro-Kann Advance (3.e5). Prioritize resources that teach PLANS and pawn structures, not just move memorization. Include top Chessable courses, Quality Chess / New In Chess books, and structured video series.` },
  { key: 'black-e4', title: 'Black vs 1.e4 — Sicilian Najdorf',
    prompt: `Find the best resources to fix Scrodinger's BLACK game vs 1.e4. His Black win rate is far below his White — this is his #1 weakness. He should consolidate on the Sicilian Najdorf (6...a6). Find the best Najdorf courses/books/video series for a 1800-2300 player (e.g. dedicated Najdorf Chessable courses, classic Najdorf books, video series). Also include 1-2 lower-theory Sicilian alternatives (e.g. Kan, Taimanov, Accelerated Dragon) in case the Najdorf's theory load is too heavy, and explain the trade-off.` },
  { key: 'black-d4', title: 'Black vs 1.d4 / 1.c4 / 1.Nf3',
    prompt: `Find the best resources for Scrodinger's BLACK repertoire vs 1.d4 and related. He plays the Nimzo-Indian (E43) and needs a coherent system: Nimzo-Indian + a backup when White avoids it with 3.Nf3 (e.g. Ragozin / QGD / Queen's Indian / Bogo-Indian). Find top courses/books that present a complete, connected 1.d4 repertoire for ~1800-2300, ideally Nimzo-based. Include how to handle 1.c4 and 1.Nf3 move orders.` },
  { key: 'tactics', title: 'Tactics & Calculation Training',
    prompt: `Scrodinger already has a strong tactical eye (puzzle 2073-2212) but needs SPEED and CALCULATION DEPTH (his blitz lags rapid by 500 pts). Find the best tactics & calculation resources: platforms (lichess puzzles, Chess.com, ChessTempo, CT-ART, Chessable tactics, Aimchess), and the best CALCULATION-training books (e.g. works on calculation/visualization/candidate moves). Distinguish pattern-recognition tools from deep-calculation training. Prioritize what moves a 2000+ tactician toward 2300+.` },
  { key: 'endgames', title: 'Endgame Mastery',
    prompt: `Endgames are likely Scrodinger's most undertrained area. Find the best endgame resources for a 1700-2300 player, ordered by difficulty: foundational (Silman Complete Endgame Course), intermediate, and advanced (Dvoretsky's Endgame Manual). Include the best Chessable endgame courses, the best endgame video series (e.g. Saint Louis Chess Club, Naroditsky endgame content), and any interactive endgame trainers (e.g. lichess practice, chess.com endgame drills, Endgame tablebase tools).` },
  { key: 'strategy', title: 'Positional / Strategy / Middlegame',
    prompt: `Find the best resources for the 1700->2200 POSITIONAL jump — Scrodinger loses the thread transitioning from opening to middlegame. Cover: pawn structures (IQP, hanging pawns, pawn chains, Carlsbad), prophylaxis, planning, piece activity, imbalances. Include the classic books (Silman Reassess Your Chess, Nimzowitsch My System, Watson, Marovic, Sokolov pawn structure books), the Yusupov "Build/Boost/Evolve Your Chess" series, and top strategy Chessable courses / video series.` },
  { key: 'attack-defense', title: 'King Safety, Attack & Defense',
    prompt: `Scrodinger loses to coordinated middlegame attacks on his king (named weakness) and is himself an aggressive attacker. Find the best resources on ATTACKING the king AND on DEFENSE / king safety / prophylactic defense. Include classics (Vukovic Art of Attack, Aagaard attacking/defending books, Dorfman, Polgar mating patterns), defense-specific books, and any Chessable/video courses on attack and defense for ~1800-2300.` },
  { key: 'video-yt', title: 'Video Courses & YouTube Channels',
    prompt: `Find the best VIDEO learning for structured improvement to 2300+. Must include: Daniel Naroditsky (speedruns, endgame, "Sensei" content), Saint Louis Chess Club lectures (which lecturers/series are best), Hanging Pawns (opening deep-dives), ChessBase India, GothamChess (and which content is actually instructional vs entertainment), GMHikaru educational bits, Chess.com lessons, and any premium structured video academies. For each, say exactly which series/playlists a 2000-rated player should watch and why.` },
  { key: 'platforms-tools', title: 'Interactive Platforms & Training Tools',
    prompt: `Find the best interactive PLATFORMS and TOOLS for training and analysis: Chessable (spaced-repetition — explain MoveTrainer), Aimchess (weakness analytics), Chessmood, iChess, Chess.com Insights/lessons, lichess Studies + analysis + opening explorer, ChessBase (PC database software) + Mega Database, DecodeChess (AI explanations), and any modern AI-coaching tools. Explain what each is best at and how Scrodinger should use it. Include game-analysis workflow tools.` },
  { key: 'coaching', title: 'Coaching, Academies & Structured Programs',
    prompt: `Find the best COACHING and structured PROGRAMS for a serious improver: how/where to find a strong coach (Chessable coaches, chess.com coaches, Chessmood, Killer Chess Training, online academies), structured training programs, and India-relevant options (ChessBase India, Indian academies/coaches, since the player may be in India given the rahul_kumar handle). Include realistic pricing. Also cover the value of a coach at the 2000-2200 wall.` },
  { key: 'methodology', title: 'Improvement Methodology & OTB Prep',
    prompt: `Find the best resources on HOW to improve and how to prepare for OTB tournaments (he has not played FIDE-rated yet). Include improvement-methodology books (e.g. "The Process" by various, de la Maza Rapid Chess Improvement critique, "Chess Improvement" by Barry Hymer/Peter Wells, Smith "Pump Up Your Rating", Hendriks "Move First Think Later", Rowson "Chess for Zebras"), how to analyze your own games, building a study plan, tournament/time-management prep, and the psychology of competitive chess.` },
  { key: 'study-collections', title: 'Master Game Collections & Classics',
    prompt: `Find the best annotated MASTER GAME COLLECTIONS and classic instructive books every improving player should study (Zurich 1953 Bronstein, Logical Chess Chernev, Most Instructive Games Chernev, My 60 Memorable Games Fischer, Tal-Botvinnik 1960, Understanding Chess Move by Move Nunn, Kasparov's My Great Predecessors, etc.). For each, note what it teaches and which fit Scrodinger's aggressive Sicilian/Nimzo style and his needs at 1700-2300.` },
]

// ---- Phase 1+2: research each dimension, then adversarially verify it ----
log('Researching 12 chess-resource categories and verifying each against the live web...')

const verified = await pipeline(
  DIMENSIONS,
  (d) => agent(
    `${PROFILE}\n\nYOU ARE A CHESS-RESOURCE RESEARCHER. Category: "${d.title}".\n\n${d.prompt}\n\n` +
    `METHOD: Use WebSearch to find candidate resources, then WebFetch the most promising official pages (Chessable, publisher sites, YouTube, Amazon, chess.com, lichess) to confirm titles, authors, prices, and URLs. Do MULTIPLE searches with varied queries. Return 6-12 REAL, currently-available resources. ` +
    `Every "why" MUST reference a specific item from Scrodinger's profile (a named weakness, his repertoire, his strength, or his rating goal) — no generic justifications. Be concrete with prices and canonical URLs. Mark each Essential/Recommended/Optional.`,
    { label: `research:${d.key}`, phase: 'Research', schema: RESEARCH_SCHEMA, effort: 'medium' }
  ),
  (res, d) => agent(
    `${PROFILE}\n\nYOU ARE AN ADVERSARIAL FACT-CHECKER for chess resources. Category: "${res.category}".\n\n` +
    `Here are researched resources as JSON:\n${JSON.stringify(res.resources, null, 1)}\n\n` +
    `For EACH resource: use WebSearch/WebFetch to confirm it genuinely exists, the author/provider is correct, it is currently available, and the price is roughly right. Correct any wrong URL/price/author/level. Set verified=true ONLY if you confirmed it real and accurately described; otherwise verified=false with a note. Default to skepticism: if you cannot confirm a specific course/book really exists, mark verified=false and confidence=low. Drop obvious hallucinations entirely. Also re-check that each "why" is genuinely personalized to Scrodinger and tighten it if weak. Reputable, well-known resources (Silman, Dvoretsky, Vukovic, Naroditsky, Saint Louis CC, established Chessable bestsellers) can be high-confidence. Return the cleaned list.`,
    { label: `verify:${d.key}`, phase: 'Verify', schema: VERIFY_SCHEMA, effort: 'high' }
  )
)

// keep only resources that survived verification
const clean = verified.filter(Boolean).map(v => ({
  category: v.category,
  resources: (v.resources || []).filter(r => r.verified && r.confidence !== 'low'),
}))
const allResources = clean.flatMap(c => c.resources.map(r => ({ ...r, category: c.category })))
log(`Verified ${allResources.length} resources across ${clean.length} categories. Synthesizing curriculum...`)

// ---- Phase 3: synthesize the personalized curriculum ----
phase('Synthesize')
const synthesis = await agent(
  `${PROFILE}\n\nYOU ARE A CHESS TRAINING DIRECTOR building Scrodinger's personalized curriculum from a VERIFIED resource pool.\n\n` +
  `VERIFIED RESOURCES (JSON):\n${JSON.stringify(allResources, null, 1)}\n\n` +
  `Produce a curated curriculum: (1) essential_stack — the ranked must-have core (mix tactics/endgame/strategy/repertoire/methodology), the things to start FIRST, each with a personalized why; (2) phase_mapping — assign resources to "Phase 1 — Foundation (Months 1-6)", "Phase 2 — Positional & OTB (Months 7-18)", "Phase 3 — Expert & Norms (Months 18-36)"; (3) weakness_fixes — map each named weakness (Black repertoire, king safety, blitz/calc speed, middlegame transition, endgames, OTB inexperience) to specific resources + the method to use them; (4) weekly_integration — a concrete weekly template slotting named resources into blocks; (5) gaps — anything still missing. Use ONLY resource names that appear in the verified pool. Be specific and personalized throughout.`,
  { label: 'synthesize:curriculum', phase: 'Synthesize', schema: SYNTH_SCHEMA, effort: 'high' }
)

return { synthesis, categories: clean, totalVerified: allResources.length }
