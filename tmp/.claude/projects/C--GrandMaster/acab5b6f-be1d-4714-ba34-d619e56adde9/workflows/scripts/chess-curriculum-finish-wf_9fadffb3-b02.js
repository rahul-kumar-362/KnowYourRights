export const meta = {
  name: 'chess-curriculum-finish',
  description: 'Finish the chess curriculum: write 3 missing endgames with verify, re-verify existing endgames for accuracy, write all conceptual files (strategy/openings/calc/mindset/attack/defense/psych/start), and folder indexes.',
  phases: [
    { title: 'Endgames and Verify' },
    { title: 'Concepts' },
    { title: 'Folder Indexes' },
  ],
}

const ROOT = 'C:/GrandMaster/'
const name = p => (typeof p === 'string' ? p : p.path).split('/').pop()

const SG = `You are an expert chess coach and trainer (FIDE 2500+) writing ONE markdown file for a comprehensive "1500 to 2800 FIDE" study curriculum. Write GitHub-flavored Markdown, accurate, concrete and coach-like. Target 1000 to 1800 words.

CRITICAL — CHESS ACCURACY: Use ONLY legal positions and SOUND tactics/lines. Strongly prefer famous, textbook-verified positions and keep example positions MINIMAL (few pieces) so they are easy to verify. Use standard algebraic notation. Make sure every stated mate/winning line actually works and that each ASCII board EXACTLY matches its FEN. Double-check before saving.

REQUIRED STRUCTURE (use these exact section headings in order):
1. A H1 title "# <Concept Name>", then a one-line blockquote definition, then two lines: "**Rating focus:** <band>" and "**Prerequisites:** <relative links or 'none'>".
2. "## The idea" — plain-English explanation.
3. "## Why it matters" — practical value at the board.
4. "## Diagrams" — at least TWO board diagrams. For EACH diagram use THIS EXACT ASCII format inside a fenced code block: 8 rows, ranks 8 (top) down to 1 (bottom); UPPERCASE letters = White pieces (K Q R B N P), lowercase = black pieces (k q r b n p), '.' = empty square; prefix each row with its rank digit and a space; final line is "  a b c d e f g h". Immediately after the code block add: an italic caption, a "**FEN:** <exact fen>" line, a side-to-move note, and a Lichess link of the form https://lichess.org/analysis/<FEN with every space replaced by an underscore>. Then explain the key moves in algebraic notation.
5. "## Patterns and sub-types" — bullet the main variations and related motifs.
6. "## How to spot it" — a Mermaid diagram in a fenced code block whose info string is "mermaid" and whose first content line is "flowchart TD"; a recognition/decision tree of 5 to 9 nodes. Node text in square brackets, arrows use -->, edge labels use |label|. Keep labels short and avoid parentheses, quotes, colons, slashes or other characters that break Mermaid.
7. "## Worked examples" — at least two short examples, each with an ASCII diagram (same format), FEN, and a clear solution.
8. "## Common mistakes" — bullets.
9. "## Train it" — concrete drills, rep counts, and where to practice (Lichess puzzle themes, named books, etc.).
10. "## Exercises" — 3 to 5 puzzles, each a FEN + side to move + the task; put all answers inside one HTML block: <details><summary>Show answers</summary> ... </details>.
11. "## Related" — relative markdown links to sibling files plus double-bracket concept tags like [[zugzwang]].

Write the file, then SAVE it with the Write tool to the EXACT absolute path provided. After saving, reply with ONE short line: the path and the word count.`

const VERIFY = `You are a meticulous chess fact-checker (FIDE 2400+). Read the markdown file at the given absolute path, then verify EVERY ASCII board diagram, FEN and analysis line:
- Each ASCII board must EXACTLY match its FEN (piece types and exact files/ranks; UPPERCASE=White, lowercase=black, '.'=empty; rank 8 on top, rank 1 at bottom; 8 cells per row).
- Each FEN must be legal: exactly one king per side, no pawns on the 1st or 8th rank, a plausible legal position, and the side-to-move must be consistent (the side NOT to move must not be in check).
- Each stated result/mate/winning/drawing line must be SOUND. For king-and-pawn and zugzwang/triangulation/opposition claims, re-check the parity and the move sequence move-by-move; confirm any claimed zugzwang/stalemate actually occurs. If a line is unsound or a position illegal, FIX it: replace with a correct minimal position illustrating the SAME theme and update the ASCII board, FEN, Lichess link and analysis to match.
- Mermaid blocks must parse: first content line "flowchart TD", arrows -->, no parentheses/quotes/colons inside node labels.
- Notation must be correct algebraic.
Make fixes IN PLACE with the Edit tool. Do not rewrite good content or change structure. Reply with a short bullet list of fixes made, or "No changes needed".`

const makePrompt = s => `${SG}

TOPIC FOR THIS FILE: ${s.topic}
GUIDANCE / POSITIONS TO USE: ${s.hints}
EXACT SAVE PATH (use Write to this absolute path): ${ROOT}${s.path}`

const W = (path, topic, hints) => ({ path, topic, hints })

const ENDGAMES_NEW = [
  W('05-Endgames/triangulation.md', 'Triangulation (a king maneuver that loses a single tempo to hand the move to the opponent and win a zugzwang)', 'Show a king-and-pawn position that is a RECIPROCAL ZUGZWANG (won for whichever side is NOT to move). White, being on move, plays a three-square king triangle to return to the same square having lost exactly one tempo, so the identical position now has Black to move and Black is in zugzwang. A reliable structure: the white king is in front of its passed pawn but Black holds the opposition, so White cannot push the pawn yet and instead triangulates with the king to seize the opposition, then escorts the pawn to promotion. VERIFY the zugzwang and every move move-by-move; ensure each ASCII board matches its FEN exactly. Connect to opposition and zugzwang.'),
  W('05-Endgames/queen-vs-pawn.md', 'Queen vs Pawn on the 7th Rank', 'How the queen wins versus a knight-pawn or central pawn by the zig-zag technique (check, force the king in front of the pawn, gain a tempo to bring the king up), but often only DRAWS versus a bishop-pawn or rook-pawn on the 7th because the defender has a stalemate resource. Show one winning example and one drawing exception with correct positions.'),
  W('05-Endgames/the-fortress.md', 'The Fortress (a drawn setup the stronger side cannot break despite a material deficit)', 'Define a fortress and show ONE classic, correct, verifiable fortress (for example the wrong-rook-pawn-and-bishop draw, or a rook-versus-queen fortress, or a bishop-and-wrong-rook-pawn). Keep the example minimal and make sure it is genuinely a draw.'),
]

const ENDGAMES_EXISTING = [
  '05-Endgames/king-and-pawn-endgames.md',
  '05-Endgames/zugzwang.md',
  '05-Endgames/key-squares-and-rule-of-the-square.md',
  '05-Endgames/rook-endgames.md',
  '05-Endgames/rook-vs-pawn.md',
  '05-Endgames/minor-piece-endgames.md',
  '05-Endgames/opposite-colored-bishops.md',
  '05-Endgames/converting-advantages.md',
  '05-Endgames/pawn-breakthrough.md',
]

const STRATEGY = [
  W('04-Strategy-and-Positional-Play/pawn-structures.md', 'Pawn Structures (the skeleton that dictates plans for both sides)', 'Overview of major structures: IQP, hanging pawns, Carlsbad, Maroczy bind, Stonewall, fixed chains. For each, the typical plans. Diagrams of 2-3 structures.'),
  W('04-Strategy-and-Positional-Play/isolated-doubled-backward-pawns.md', 'Pawn Weaknesses: Isolated, Doubled and Backward Pawns', 'Define each weakness, why it is weak, and when it is fine. Diagrams.'),
  W('04-Strategy-and-Positional-Play/passed-pawns.md', 'Passed Pawns', 'Blockading, passed pawns must be pushed, protected and connected passers, outside passed pawn as a decoy. Diagrams.'),
  W('04-Strategy-and-Positional-Play/weak-squares-and-outposts.md', 'Weak Squares and Outposts', 'Identifying holes, planting a knight on an outpost supported by a pawn. Diagram of a knight outpost.'),
  W('04-Strategy-and-Positional-Play/open-and-half-open-files.md', 'Open and Half-Open Files (highways for rooks)', 'Seizing open files, doubling rooks, the 7th rank, half-open files as attack lines. Diagrams.'),
  W('04-Strategy-and-Positional-Play/the-bishop-pair.md', 'The Bishop Pair', 'Why two bishops are a long-term edge, opening the position to exploit them, how the defender neutralizes them. Diagram.'),
  W('04-Strategy-and-Positional-Play/good-and-bad-bishops.md', 'Good Bishop vs Bad Bishop', 'Recognizing the bad bishop, how to improve or trade it, and fixing enemy pawns to make their bishop bad. Diagrams.'),
  W('04-Strategy-and-Positional-Play/knight-vs-bishop.md', 'Knight vs Bishop (the eternal imbalance)', 'When the knight is better vs the bishop, and how to steer toward your favorable minor piece. Diagrams.'),
  W('04-Strategy-and-Positional-Play/the-center-and-space.md', 'The Center and Space Advantage', 'Types of centers, the value of space, the defender seeks exchanges to relieve cramped positions. Diagrams.'),
  W('04-Strategy-and-Positional-Play/the-minority-attack.md', 'The Minority Attack', 'The classic Carlsbad minority attack: b4-b5 to create a backward c-pawn or weak square. Show the structure and plan with a diagram.'),
  W('04-Strategy-and-Positional-Play/prophylaxis-and-restriction.md', 'Prophylaxis and Restriction', 'Ask what the opponent wants and stop it; restrain enemy pieces and pawn breaks. Examples of prophylactic moves.'),
  W('04-Strategy-and-Positional-Play/piece-activity-and-coordination.md', 'Piece Activity and Coordination', 'The worst-placed piece principle, harmony, centralization, rerouting maneuvers. Diagrams.'),
  W('04-Strategy-and-Positional-Play/king-safety-and-pawn-shields.md', 'King Safety and the Pawn Shield', 'Evaluating king safety, weaknesses from pawn moves near the king, opposite-side castling, when to keep the king central. Diagrams.'),
  W('04-Strategy-and-Positional-Play/the-two-weaknesses-principle.md', 'The Principle of Two Weaknesses', 'One weakness is defensible; create a SECOND front to overstretch the defense. Diagram and a model plan.'),
  W('04-Strategy-and-Positional-Play/exchanges-and-when-to-trade.md', 'Exchanges: When and What to Trade', 'Trade when ahead, trade the opponent good pieces, keep pieces when attacking or with more space; trading toward a won vs drawn endgame. Guidelines plus diagram.'),
  W('04-Strategy-and-Positional-Play/maneuvering-and-improving-pieces.md', 'Maneuvering and Improving Your Position', 'How strong players improve slowly: regroup, provoke weaknesses, build up before breaking. Example maneuvers and a diagram.'),
]

const OPENINGS = [
  W('06-Openings/opening-principles.md', 'Opening Principles', 'Develop, control the center, castle, connect rooks, do not move the same piece twice; common mistakes; how principles become plans. One annotated short opening.'),
  W('06-Openings/building-a-repertoire.md', 'Building an Opening Repertoire', 'Choosing White and Black repertoires, depth over breadth, ideas over moves, using a database, how needs change from 1500 to 2800.'),
  W('06-Openings/open-games-1e4-e5.md', 'Open Games after 1.e4 e5 (Italian, Ruy Lopez, Scotch, Petroff, gambits)', 'Key ideas of the Italian, Ruy Lopez, Scotch, Petroff; typical plans; one diagram of a main tabiya.'),
  W('06-Openings/the-sicilian-and-semi-open-games.md', 'The Sicilian and Other Semi-Open Defenses (Caro-Kann, French, Scandinavian, Pirc)', 'Why c5 fights for the win, Open vs Closed Sicilian, the character of the French, Caro-Kann, Scandinavian, Pirc. Diagrams of typical structures.'),
  W('06-Openings/queens-gambit-and-d4-structures.md', 'The Queens Gambit and 1.d4 Structures (QGD, QGA, Slav, Carlsbad)', 'Central control with d4/c4, the QGD/Slav/QGA character, the Carlsbad structure and minority attack, the c8 bishop problem. Diagrams.'),
  W('06-Openings/indian-defenses-and-fianchetto.md', 'Indian Defenses and the Fianchetto (Nimzo, Queens Indian, Kings Indian, Gruenfeld, Catalan)', 'Hypermodern ideas, Nimzo doubling pawns, KID kingside storm vs queenside play, Gruenfeld pressure on the big center, the fianchetto bishop. Diagrams.'),
  W('06-Openings/gambits-traps-and-pitfalls.md', 'Gambits, Traps and Common Opening Pitfalls', 'Sound vs dubious gambits, famous traps (Legal mate, Fried Liver, Noahs Ark, Lasker trap), and how not to over-rely on traps. Diagrams of 2 famous traps with correct lines.'),
]

const CALC = [
  W('02-Board-Vision-and-Calculation/visualization-training.md', 'Board Vision and Visualization Training', 'Square colors, knight-distance, blindfold mini-drills, calculate without moving the pieces, coordinate drills. Concrete daily exercises.'),
  W('02-Board-Vision-and-Calculation/calculation-method.md', 'A Method for Calculation', 'Kotov tree with criticisms, Aagaard candidate-move method, checks-captures-threats, calculating forcing lines deeply. Worked calculation on a tactical position.'),
  W('02-Board-Vision-and-Calculation/candidate-moves-and-the-tree.md', 'Candidate Moves and Managing the Analysis Tree', 'Generating candidate moves, pruning, look at all checks and captures, the comparison method. Diagram with several candidates.'),
  W('02-Board-Vision-and-Calculation/evaluating-positions.md', 'Evaluating a Position', 'The evaluation checklist, static vs dynamic factors, when activity beats material, forming a plan. Worked evaluation of a diagram.'),
  W('02-Board-Vision-and-Calculation/prophylactic-and-defensive-calculation.md', 'Defensive Calculation and Prophylaxis at the Board', 'Calculating opponent threats, the is-it-safe check, finding the only-move defense. Examples.'),
]

const MINDSET = [
  W('01-Mindset-and-Study-Method/deliberate-practice.md', 'Deliberate Practice for Chess', 'Work at the edge of ability, immediate feedback, focused reps, why mindless blitz does not improve you. A concrete deliberate-practice loop.'),
  W('01-Mindset-and-Study-Method/building-a-study-routine.md', 'Building a Sustainable Study Routine', 'Splitting time across tactics, endgames, openings, games and analysis at different levels; consistency over cramming; sample weekly hours by rating.'),
  W('01-Mindset-and-Study-Method/analyzing-your-own-games.md', 'Analyzing Your Own Games', 'Annotate before the engine, find critical moments, classify mistakes, keep an error log, THEN check the engine. Step-by-step process.'),
  W('01-Mindset-and-Study-Method/using-engines-databases-and-tablebases.md', 'Using Engines, Databases and Tablebases Wisely', 'Engines for verification not thinking, querying a database for plans, when tablebases settle an endgame, avoiding engine-dependence. Practical workflow.'),
  W('01-Mindset-and-Study-Method/learning-from-master-games.md', 'Learning from Master and Model Games', 'Studying annotated classics, guess-the-move training, choosing model games for your structures. A short study protocol and recommended collections.'),
]

const ATKDEF = [
  W('07-Attacking-Play/attacking-the-castled-king.md', 'Attacking the Castled King', 'Bring more attackers than defenders, open files and diagonals, the pawn storm, remove the key defender. Diagram of a typical kingside attack.'),
  W('07-Attacking-Play/the-greek-gift-bxh7.md', 'The Greek Gift Sacrifice (Bxh7+)', 'The classic bishop sac on h7 then Ng5+ and Qh5, when it works and when it fails. Give the thematic position and the main lines after Kg8, Kg6 and Kh6.'),
  W('07-Attacking-Play/sacrifices-on-g7-h6-and-the-fianchetto.md', 'Sacrifices on g7, h6 and against the Fianchetto', 'Demolishing the fianchetto with Bxh6 or Bxg7 and the exchange sac, opening the king. Diagrams.'),
  W('07-Attacking-Play/opposite-side-castling-and-pawn-storms.md', 'Opposite-Side Castling and Pawn Storms', 'Both sides storm pawns; do not move your own king pawns, open a file, speed matters most. Diagram.'),
  W('07-Attacking-Play/piece-sacrifices-for-initiative.md', 'Sacrificing for the Initiative and Compensation', 'Long-term positional sacrifices for development, the initiative, a bind; judging compensation without a forced win. Examples.'),
  W('08-Defense-and-Counterattack/principles-of-defense.md', 'Principles of Defense', 'Trade attackers, find the only move, return material to break the attack, do not panic, prophylaxis, fortress; defend actively. Examples.'),
  W('08-Defense-and-Counterattack/the-art-of-counterattack.md', 'The Art of the Counterattack', 'Meet a flank attack with a central break, counterattack the overextended attacker, the in-between counterthreat. Examples.'),
  W('08-Defense-and-Counterattack/defending-worse-positions-and-saving-draws.md', 'Defending Worse Positions and Saving Draws', 'Tenacity, the swindle, setting problems, stalemate and fortress resources, perpetual check; the psychology of defense. Examples including perpetual check and a stalemate trick.'),
]

const PSYCH = [
  W('10-Tournament-and-Psychology/time-management-and-the-clock.md', 'Time Management and the Clock', 'Budgeting time, avoiding time trouble, when to think long vs fast, increment handling, the danger of the quick move after long thought. Practical rules.'),
  W('10-Tournament-and-Psychology/tournament-preparation.md', 'Tournament Preparation', 'Pre-event opening prep, scouting opponents, round-by-round routine, recovery between rounds, when to take a draw or push. Checklist.'),
  W('10-Tournament-and-Psychology/psychology-tilt-and-mental-game.md', 'Psychology, Tilt and the Mental Game', 'Handling losses, avoiding tilt, focus and emotional control, playing the board not the opponent, dealing with nerves. Techniques.'),
  W('10-Tournament-and-Psychology/physical-fitness-and-stamina.md', 'Physical Fitness, Sleep and Stamina for Chess', 'Why elite players train physically, sleep and nutrition on game day, energy management across long events, fitness and calculation stamina.'),
  W('00-Start-Here/how-to-use-this-guide.md', 'How to Use This Guide', 'Explain the folder structure, the rating-band roadmaps, how diagrams (ASCII + FEN + Lichess links) and flowcharts work, how to view FENs as real boards, and a suggested starting path. Reference the top-level README and ROADMAP.'),
  W('00-Start-Here/the-rating-ladder-explained.md', 'The Rating Ladder Explained (titles and what each level really means)', 'Explain FIDE rating bands and titles CM FM IM GM and the norm idea, what skills separate each 200-point band, realistic timelines. A Mermaid ladder flowchart.'),
  W('00-Start-Here/self-assessment-and-diagnostics.md', 'Self-Assessment and Diagnostics', 'How to diagnose your weakest area, simple self-tests, using game stats and an error log to prioritize study. A diagnostic Mermaid flowchart.'),
]

const CONCEPTS = [...STRATEGY, ...OPENINGS, ...CALC, ...MINDSET, ...ATKDEF, ...PSYCH]

const runGroup = (group, ph) => parallel(group.map(s => () => agent(makePrompt(s), { label: name(s), phase: ph })))

// Phase 1: endgames (write 3 new + verify them, and verify the 9 existing) concurrently
phase('Endgames and Verify')
const p1 = pipeline(
  ENDGAMES_NEW,
  s => agent(makePrompt(s), { label: name(s), phase: 'Endgames and Verify' }),
  (_r, s) => agent(`${VERIFY}\n\nFILE PATH: ${ROOT}${s.path}`, { label: 'verify ' + name(s), phase: 'Endgames and Verify' })
)
const p2 = parallel(ENDGAMES_EXISTING.map(p => () => agent(`${VERIFY}\n\nFILE PATH: ${ROOT}${p}`, { label: 'verify ' + name(p), phase: 'Endgames and Verify' })))
const newEnd = await p1
const verExisting = await p2
log(`Endgames: ${newEnd.filter(Boolean).length}/${ENDGAMES_NEW.length} written, ${verExisting.filter(Boolean).length}/${ENDGAMES_EXISTING.length} verified`)

// Phase 2: all conceptual files
phase('Concepts')
const concepts = await runGroup(CONCEPTS, 'Concepts')
log(`Concepts: ${concepts.filter(Boolean).length}/${CONCEPTS.length}`)

// Phase 3: folder indexes for the folders that did not yet have one
phase('Folder Indexes')
const idx = (folder, title, purpose, files) => ({
  path: `${folder}/README.md`,
  prompt: `Write a concise README.md index page (GitHub-flavored Markdown) for the "${title}" section of a 1500-to-2800 FIDE chess curriculum.
Purpose of this section: ${purpose}
Include: a short H1 title, 2 to 3 sentences on what this section covers, then a markdown table listing each file as a link with a one-line description, then a short "Suggested order" note and a line linking back to ../README.md and ../ROADMAP.md.
Files in this folder (filename then topic):
${files.map(s => `- ${name(s.path)} : ${s.topic}`).join('\n')}
Save with the Write tool to EXACTLY: ${ROOT}${folder}/README.md . Reply with one short line.`,
})
const FLOW_LIST = [
  W('flowcharts/master-roadmap-flowchart.md','Master roadmap 1500 to 2800',''),
  W('flowcharts/the-thinking-process.md','Move-selection flowchart',''),
  W('flowcharts/tactic-recognition.md','Spotting tactics',''),
  W('flowcharts/endgame-decision-tree.md','Routing endgames to technique',''),
  W('flowcharts/opening-choice.md','Choosing a repertoire',''),
  W('flowcharts/when-to-trade-pieces.md','When to exchange',''),
]
const READMES = [
  idx('00-Start-Here', 'Start Here', 'orientation and how to use the guide', PSYCH.filter(s => s.path.startsWith('00'))),
  idx('01-Mindset-and-Study-Method', 'Mindset and Study Method', 'how to actually improve and study effectively', MINDSET),
  idx('02-Board-Vision-and-Calculation', 'Board Vision and Calculation', 'seeing the board and calculating accurately', CALC),
  idx('04-Strategy-and-Positional-Play', 'Strategy and Positional Play', 'long-term positional understanding', STRATEGY),
  idx('06-Openings', 'Openings', 'opening principles and repertoire building', OPENINGS),
  idx('07-Attacking-Play', 'Attacking Play', 'attacking the king and sacrifices', ATKDEF.filter(s => s.path.startsWith('07'))),
  idx('08-Defense-and-Counterattack', 'Defense and Counterattack', 'defending and counterattacking', ATKDEF.filter(s => s.path.startsWith('08'))),
  idx('10-Tournament-and-Psychology', 'Tournament and Psychology', 'competitive and mental-game skills', PSYCH.filter(s => s.path.startsWith('10'))),
  idx('flowcharts', 'Flowcharts', 'decision diagrams for the whole guide', FLOW_LIST),
]
const readmeRes = await parallel(READMES.map(r => () => agent(r.prompt, { label: 'README ' + r.path.split('/')[0], phase: 'Folder Indexes', effort: 'low' })))
log(`Indexes: ${readmeRes.filter(Boolean).length}/${READMES.length}`)

return { endgamesNew: newEnd.filter(Boolean).length, endgamesVerified: verExisting.filter(Boolean).length, concepts: concepts.filter(Boolean).length, readmes: readmeRes.filter(Boolean).length }