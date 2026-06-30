export const meta = {
  name: 'chess-grandmaster-curriculum',
  description: 'Author a complete 1500 to 2800 FIDE chess curriculum: tactics, strategy, endgames, openings, plans, with diagrams, Mermaid flowcharts and exercises; verify chess accuracy of concrete files.',
  phases: [
    { title: 'Tactics' },
    { title: 'Verify Tactics' },
    { title: 'Endgames' },
    { title: 'Verify Endgames' },
    { title: 'Strategy' },
    { title: 'Openings' },
    { title: 'Calculation' },
    { title: 'Mindset' },
    { title: 'Attack and Defense' },
    { title: 'Training Plan' },
    { title: 'Psychology and Start' },
    { title: 'Flowcharts' },
    { title: 'Folder Indexes' },
  ],
}

const ROOT = 'C:/GrandMaster/'
const name = p => (typeof p === 'string' ? p : p.path).split('/').pop()

const SG = `You are an expert chess coach and trainer (FIDE 2500+) writing ONE markdown file for a comprehensive "1500 to 2800 FIDE" study curriculum. Write GitHub-flavored Markdown, accurate, concrete and coach-like. Target 1000 to 1800 words.

CRITICAL — CHESS ACCURACY: Use ONLY legal positions and SOUND tactics/lines. Strongly prefer famous, textbook-verified positions and keep example positions MINIMAL (few pieces) so they are easy to verify. Use standard algebraic notation. Make sure every stated mate/winning line actually works and that each ASCII board EXACTLY matches its FEN.

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
11. "## Related" — relative markdown links to sibling files like [Deflection](deflection.md), plus double-bracket concept tags like [[deflection]].

Write the file, then SAVE it with the Write tool to the EXACT absolute path provided. After saving, reply with ONE short line: the path, the word count, and the FENs you used.`

const VERIFY = `You are a meticulous chess fact-checker (FIDE 2400+). Read the markdown file at the given absolute path, then verify EVERY ASCII board diagram, FEN and analysis line:
- Each ASCII board must EXACTLY match its FEN (piece types and exact files/ranks; UPPERCASE=White, lowercase=black, '.'=empty; rank 8 on top, rank 1 at bottom; 8 cells per row).
- Each FEN must be legal: exactly one king per side, no pawns on the 1st or 8th rank, a plausible legal position.
- Each stated tactic/mate/winning line must be SOUND. If a line is unsound or a position is illegal, FIX it: replace with a correct minimal position illustrating the SAME theme and update the ASCII board, FEN, Lichess link and analysis to match.
- Mermaid blocks must parse: first content line "flowchart TD", arrows -->, no parentheses/quotes/colons inside node labels.
- Notation must be correct algebraic.
Make fixes IN PLACE with the Edit tool. Do not rewrite good content or change structure. Reply with a short bullet list of fixes made, or "No changes needed".`

const makePrompt = s => `${SG}

TOPIC FOR THIS FILE: ${s.topic}
GUIDANCE / POSITIONS TO USE: ${s.hints}
EXACT SAVE PATH (use Write to this absolute path): ${ROOT}${s.path}`

const W = (path, topic, hints) => ({ path, topic, hints })

const TACTICS = [
  W('03-Tactics/fork.md', 'The Fork (one piece attacking two or more enemy targets at once)', 'Cover knight forks including the royal fork on king+queen, the family fork (K+Q+R), pawn forks, bishop/rook/queen forks. Use a minimal position of a white knight forking the black king and rook, and a pawn forking two pieces.'),
  W('03-Tactics/pin.md', 'The Pin (a piece cannot or should not move because a more valuable piece sits behind it)', 'Distinguish ABSOLUTE pin (against the king, illegal to move) vs RELATIVE pin. Show a bishop pinning a knight to the king, and piling up on the pinned piece / pin-to-win. Mention not to leave pieces pinned.'),
  W('03-Tactics/skewer.md', 'The Skewer (the reverse pin: a valuable piece is attacked and forced to move, exposing a lesser piece behind it)', 'Use a rook or bishop skewering the black king and queen on a line, winning the queen. Show a minimal R+K vs K+Q skewer and a bishop skewer on a diagonal.'),
  W('03-Tactics/discovered-attack.md', 'The Discovered Attack (moving one piece unveils an attack from a piece behind it)', 'Show a discovered attack where moving a knight or bishop unveils a rook or queen attack, often with the moving piece ALSO making a threat. Keep minimal.'),
  W('03-Tactics/discovered-check.md', 'Discovered Check and Double Check', 'Explain discovered check and DOUBLE CHECK (both pieces give check, king MUST move). Note double check is the most forcing move. Link to windmill and smothered mate.'),
  W('03-Tactics/double-attack.md', 'The Double Attack (creating two simultaneous threats so the opponent cannot meet both)', 'Broader than the fork: a queen attacking two loose pieces, a check that also attacks a piece, threats of mate plus material. Relate to the fork. Geometry of loose pieces, LPDO loose pieces drop off.'),
  W('03-Tactics/decoy.md', 'The Decoy (attraction: luring an enemy piece, often the king, to a bad square via a sacrifice)', 'Classic: sacrifice to drag the king onto a square where a knight fork or check wins the queen. Show a queen or rook sacrifice that decoys the king, then a knight fork. Distinguish from deflection.'),
  W('03-Tactics/deflection.md', 'Deflection (luring or forcing a defender away from a key duty)', 'Show a back-rank deflection: deflect the rook or queen guarding the back rank, then mate. Also deflection that removes the guard of a key square. Contrast with decoy and removing-the-defender.'),
  W('03-Tactics/removing-the-defender.md', 'Removing the Defender (eliminating the piece that guards a key square, piece or mating square)', 'Capture or chase the defender, then execute the threat. Show capturing a knight that defends a back-rank mating square.'),
  W('03-Tactics/overloading.md', 'The Overloaded Piece (a defender tasked with too many duties)', 'A piece guarding two things at once; attack one duty and the other collapses. Minimal example with one rook defending both a back-rank square and a hanging piece.'),
  W('03-Tactics/interference.md', 'Interference and Obstruction (interposing a piece to cut the line between a defender and what it defends)', 'Block the defensive line, often with a sacrifice, so a piece is no longer guarded. Classic interference motif.'),
  W('03-Tactics/clearance-sacrifice.md', 'Clearance and Line-Opening Sacrifices (vacating a square, file, rank or diagonal for another piece)', 'Sacrifice or move a piece to clear a key square or open a line so another piece delivers the blow. Include square-clearance and line-clearance.'),
  W('03-Tactics/zwischenzug.md', 'Zwischenzug / Intermezzo (an in-between move inserted before the expected recapture)', 'Insert a more forcing move, a check or bigger threat, before recapturing, changing the outcome. Minimal example where a check wins a tempo or piece before recapture.'),
  W('03-Tactics/x-ray.md', 'The X-ray (a long-range piece acts through an enemy or friendly piece on a line)', 'X-ray attack and X-ray defense: a rook, queen or bishop defends or attacks a square THROUGH an intervening piece. Distinguish from skewer.'),
  W('03-Tactics/windmill.md', 'The Windmill / See-saw (a repeating discovered-check mechanism that harvests material)', 'Explain with the famous Carlos Torre vs Emanuel Lasker, Moscow 1925 windmill, rook plus bishop see-saw on the 7th rank. Show the mechanism with a minimal diagram and the move sequence.'),
  W('03-Tactics/trapped-piece.md', 'Trapping a Piece (restricting an enemy piece until it can be captured)', 'Trapped bishop, trapped rook, trapped queen. Show a knight or pawns trapping a bishop on the rim.'),
  W('03-Tactics/back-rank-mate.md', 'The Back-Rank Mate and Back-Rank Weakness', 'Mate on the 8th or 1st rank when the king is boxed in by its own pawns. Show a rook or queen delivering mate behind a wall of pawns; explain luft. Include a deflection-to-back-rank combo.'),
  W('03-Tactics/smothered-mate.md', 'Smothered Mate (the king is mated by a knight while hemmed in by its own pieces)', 'Show Philidor legacy pattern: Qg8+ Rxg8 Nf7# with the king on h8 surrounded by g7 and h7 pawns and the rook on g8/f8. Provide the exact minimal position and the forcing sequence.'),
  W('03-Tactics/desperado.md', 'The Desperado (a doomed piece sells itself as dearly as possible)', 'A piece that is going to be lost grabs material or creates a threat first; also mutual-capture sequences. Minimal example.'),
  W('03-Tactics/underpromotion.md', 'Underpromotion Tactics (promoting to knight, rook or bishop instead of a queen)', 'Knight underpromotion with check or fork, rook underpromotion to avoid stalemate, bishop underpromotion. Show the classic knight-promotion-with-fork and a rook-to-avoid-stalemate example.'),
  W('03-Tactics/combinations-and-sacrifices.md', 'Combinations and Sacrifices (chaining motifs into a forcing sequence)', 'How combinations are built from forcing moves, real vs sham sacrifices, calculating to a clear gain. Emphasize CCT checks captures threats. Reference a short famous combination.'),
  W('03-Tactics/mating-patterns.md', 'Essential Mating Patterns and Mating Nets', 'Catalogue key named mates with minimal diagrams: back rank, smothered, Anastasia, Arabian, Boden, Damiano, Greco, Legal, ladder two-rook, basic Q+K mate. One tiny diagram plus idea for several patterns.'),
]

const ENDGAMES = [
  W('05-Endgames/king-and-pawn-endgames.md', 'King and Pawn Endgames (the foundation of all endgame technique)', 'Basic K+P vs K win or draw, the role of the king, when a pawn queens. Reference opposition, key squares, rule of the square. Use canonical positions.'),
  W('05-Endgames/the-opposition.md', 'The Opposition (kings facing off with one square between them; the side NOT to move often wins the key squares)', 'Direct, distant and diagonal opposition. Show the textbook K+P vs K position where taking the opposition wins or draws. Minimal kings-and-one-pawn diagrams.'),
  W('05-Endgames/triangulation.md', 'Triangulation (a king maneuver to lose a tempo and pass the move to the opponent, winning a zugzwang)', 'THE classic triangulation: the king triangulates to reach the same position with the opponent to move, forcing zugzwang in a K+P endgame. Give a clean known triangulation position with the move sequence and a before/after. Connect to opposition and zugzwang.'),
  W('05-Endgames/zugzwang.md', 'Zugzwang (any move worsens the position; the obligation to move is a liability)', 'Define zugzwang and mutual/reciprocal zugzwang, how it powers king-and-pawn endgames. Show a clean zugzwang where whoever moves loses. Connect to triangulation and opposition.'),
  W('05-Endgames/key-squares-and-rule-of-the-square.md', 'Key Squares and the Rule of the Square', 'Key squares for K+P endings, and the rule of the square for whether a lone king catches a passed pawn. Show both with diagrams.'),
  W('05-Endgames/rook-endgames.md', 'Rook Endgames: Lucena, Philidor, the 7th Rank and Rook Activity', 'The two pillars: LUCENA position (building a bridge to promote R+P vs R) and PHILIDOR position (passive 3rd-rank defense then check from behind). Give canonical positions and method for each. Add rooks belong behind passed pawns and activity over material.'),
  W('05-Endgames/rook-vs-pawn.md', 'Rook vs Pawn Endgames', 'When the rook stops the pawn and when the pawn with king support draws or wins; the short side / long side idea and cutting off the king. Minimal diagrams.'),
  W('05-Endgames/queen-vs-pawn.md', 'Queen vs Pawn on the 7th Rank', 'How the queen wins vs a knight or central pawn but often only draws vs a bishop or rook pawn on the 7th. Show the zig-zag technique and the drawing exceptions.'),
  W('05-Endgames/minor-piece-endgames.md', 'Minor-Piece Endgames Overview (bishop vs knight)', 'When the bishop beats the knight (open positions, pawns on both wings) vs when the knight is better (closed, fixed targets, strong outpost). Include the wrong-bishop note.'),
  W('05-Endgames/opposite-colored-bishops.md', 'Opposite-Colored Bishop Endgames', 'Why two extra pawns can still draw with opposite bishops; the defender blockades on its color; in the middlegame the attacker often wins. Minimal diagrams.'),
  W('05-Endgames/the-fortress.md', 'The Fortress (a drawn setup the stronger side cannot break despite material deficit)', 'Define fortress, show one classic correct fortress example. Keep clean and correct.'),
  W('05-Endgames/converting-advantages.md', 'Converting an Advantage (technique when ahead)', 'Trade pieces not pawns when ahead, the two-weaknesses principle, do not rush, improve the worst piece, avoid counterplay. Link to strategy two-weaknesses file.'),
  W('05-Endgames/pawn-breakthrough.md', 'The Pawn Breakthrough (sacrificing pawns to create an unstoppable passer)', 'The classic connected-pawns breakthrough where a pawn sacrifice clears the way to promote. Show the textbook breakthrough position and the sequence.'),
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

const PLAN = [
  W('09-Training-Plan/01-band-1500-1700.md', 'Training Roadmap: 1500 to 1700 FIDE (consolidating basics, eliminating blunders)', 'Daily tactics, basic endgames, simple repertoire, blunder-checking habit, analyze every game. Milestones, time budget, what to study and skip. Include a small Mermaid roadmap flowchart for this band.'),
  W('09-Training-Plan/02-band-1700-1900.md', 'Training Roadmap: 1700 to 1900 FIDE (calculation and positional foundations)', 'Deeper tactics and calculation method, pawn structures, the bishop pair, rook endgames, repertoire understanding. Milestones, weekly plan, Mermaid flowchart.'),
  W('09-Training-Plan/03-band-1900-2100.md', 'Training Roadmap: 1900 to 2100 FIDE (Expert / Candidate Master skills)', 'Advanced strategy, complex endgames, serious opening prep with a database, model games. Milestones, weekly plan, Mermaid flowchart.'),
  W('09-Training-Plan/04-band-2100-2300.md', 'Training Roadmap: 2100 to 2300 FIDE (FM / NM strength)', 'Deep calculation and visualization, refined repertoire with novelties, endgame mastery, opponent prep. Milestones, weekly plan, Mermaid flowchart.'),
  W('09-Training-Plan/05-band-2300-2500.md', 'Training Roadmap: 2300 to 2500 FIDE (IM toward GM)', 'Professional preparation, engines and databases at depth, a coach, norm hunting, physical and psychological prep. Milestones, Mermaid flowchart.'),
  W('09-Training-Plan/06-band-2500-2800.md', 'Training Roadmap: 2500 to 2800 FIDE (GM to world-class)', 'What separates GMs from super-GMs: opening novelties, prodigious prep, peak calculation, deep endgame and prophylactic understanding, sports-science prep, seconds. Realistic note on talent and time. Mermaid flowchart.'),
  W('09-Training-Plan/weekly-schedule-templates.md', 'Weekly Study Schedule Templates (by available hours)', 'Ready-to-use schedules for 5, 10 and 20 hours per week across tactics, endgames, strategy, openings, play and analysis. Tables.'),
  W('09-Training-Plan/recommended-resources.md', 'Recommended Books, Courses and Tools by Rating Band', 'A curated accurate list of well-known books by topic and level (tactics: Yusupov, Polgar; endgames: Silman, Dvoretsky; strategy: Nimzowitsch, Watson; calculation: Aagaard). Note which suit which band. Be accurate with titles and authors.'),
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

const FLOW = [
  W('flowcharts/master-roadmap-flowchart.md', 'Master Roadmap Flowchart: 1500 to 2800', 'A single large Mermaid flowchart (flowchart TD) showing the whole journey: rating bands as stages, skills unlocked at each, and the feedback loop play-analyze-train-weakness. Add a short legend and links to each band roadmap file. This file is mostly the flowchart plus brief notes; the standard 11-section template does NOT apply.'),
  W('flowcharts/the-thinking-process.md', 'The Thinking Process at the Board', 'A Mermaid flowchart for choosing a move each turn: opponent threats, checks captures threats, candidate moves, calculate forcing lines, is it safe, blunder-check before moving. Brief notes; flowchart-focused, not the 11-section template.'),
  W('flowcharts/tactic-recognition.md', 'Tactic Recognition Flowchart', 'A Mermaid flowchart: scan for loose pieces, exposed king, overloaded defenders, alignment of pieces for forks pins skewers, back rank; then verify by calculation. Link to each tactic file. Brief notes; flowchart-focused.'),
  W('flowcharts/endgame-decision-tree.md', 'Endgame Decision Tree', 'A Mermaid flowchart routing by material (K+P, R+P, minor piece, opposite bishops, Q vs P) to the right technique and file. Brief notes; flowchart-focused.'),
  W('flowcharts/opening-choice.md', 'Opening Choice Flowchart', 'A Mermaid flowchart guiding repertoire choice by style and study time. Links to opening files. Brief notes; flowchart-focused.'),
  W('flowcharts/when-to-trade-pieces.md', 'When to Trade Pieces Flowchart', 'A Mermaid flowchart: am I ahead, attacking, cramped, is it my good or bad piece, trading into a winning or drawn endgame. Brief notes; flowchart-focused.'),
]

const results = { tactics: 0, endgames: 0, other: 0, readmes: 0 }

phase('Tactics')
const tac = await pipeline(
  TACTICS,
  s => agent(makePrompt(s), { label: name(s), phase: 'Tactics' }),
  (_r, s) => agent(`${VERIFY}\n\nFILE PATH: ${ROOT}${s.path}`, { label: 'verify ' + name(s), phase: 'Verify Tactics' })
)
results.tactics = tac.filter(Boolean).length
log(`Tactics done: ${results.tactics}/${TACTICS.length}`)

phase('Endgames')
const end = await pipeline(
  ENDGAMES,
  s => agent(makePrompt(s), { label: name(s), phase: 'Endgames' }),
  (_r, s) => agent(`${VERIFY}\n\nFILE PATH: ${ROOT}${s.path}`, { label: 'verify ' + name(s), phase: 'Verify Endgames' })
)
results.endgames = end.filter(Boolean).length
log(`Endgames done: ${results.endgames}/${ENDGAMES.length}`)

const runGroup = (group, ph) => parallel(group.map(s => () => agent(makePrompt(s), { label: name(s), phase: ph })))

phase('Strategy')
const st = await runGroup(STRATEGY, 'Strategy')
phase('Openings')
const op = await runGroup(OPENINGS, 'Openings')
phase('Calculation')
const ca = await runGroup(CALC, 'Calculation')
phase('Mindset')
const mi = await runGroup(MINDSET, 'Mindset')
phase('Attack and Defense')
const ad = await runGroup(ATKDEF, 'Attack and Defense')
phase('Training Plan')
const pl = await runGroup(PLAN, 'Training Plan')
phase('Psychology and Start')
const ps = await runGroup(PSYCH, 'Psychology and Start')
phase('Flowcharts')
const fl = await runGroup(FLOW, 'Flowcharts')
results.other = [st, op, ca, mi, ad, pl, ps, fl].reduce((a, g) => a + g.filter(Boolean).length, 0)

phase('Folder Indexes')
const idx = (folder, title, purpose, specs) => ({
  path: `${folder}/README.md`,
  prompt: `Write a concise README.md index page (GitHub-flavored Markdown) for the "${title}" section of a 1500-to-2800 FIDE chess curriculum.
Purpose of this section: ${purpose}
Include: a short H1 title, 2 to 3 sentences on what this section covers and why it matters, then a markdown table listing each file as a link with a one-line description, then a short "Suggested order" note and a line linking back to the top-level ../README.md and ../ROADMAP.md.
Files in this folder (filename then topic):
${specs.map(s => `- ${name(s.path)} : ${s.topic}`).join('\n')}
Save with the Write tool to EXACTLY: ${ROOT}${folder}/README.md . Reply with one short line.`,
})
const READMES = [
  idx('00-Start-Here', 'Start Here', 'orientation and how to use the guide', PSYCH.filter(s => s.path.startsWith('00'))),
  idx('01-Mindset-and-Study-Method', 'Mindset and Study Method', 'how to actually improve and study effectively', MINDSET),
  idx('02-Board-Vision-and-Calculation', 'Board Vision and Calculation', 'seeing the board and calculating accurately', CALC),
  idx('03-Tactics', 'Tactics', 'all tactical motifs from fork to combinations', TACTICS),
  idx('04-Strategy-and-Positional-Play', 'Strategy and Positional Play', 'long-term positional understanding', STRATEGY),
  idx('05-Endgames', 'Endgames', 'endgame technique from K+P to rook endings', ENDGAMES),
  idx('06-Openings', 'Openings', 'opening principles and repertoire building', OPENINGS),
  idx('07-Attacking-Play', 'Attacking Play', 'attacking the king and sacrifices', ATKDEF.filter(s => s.path.startsWith('07'))),
  idx('08-Defense-and-Counterattack', 'Defense and Counterattack', 'defending and counterattacking', ATKDEF.filter(s => s.path.startsWith('08'))),
  idx('09-Training-Plan', 'Training Plan', 'rating-band roadmaps and schedules', PLAN),
  idx('10-Tournament-and-Psychology', 'Tournament and Psychology', 'competitive and mental-game skills', PSYCH.filter(s => s.path.startsWith('10'))),
]
const readmeRes = await parallel(READMES.map(r => () => agent(r.prompt, { label: 'README ' + r.path.split('/')[0], phase: 'Folder Indexes', effort: 'low' })))
results.readmes = readmeRes.filter(Boolean).length

log(`ALL DONE — tactics:${results.tactics} endgames:${results.endgames} other:${results.other} readmes:${results.readmes}`)
return results