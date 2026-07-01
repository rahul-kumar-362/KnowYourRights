# Frontend & Deployment

## The constraint that shaped everything

The frontend was built (redesigned, actually — it started functional-but-plain) under one
absolute rule, given up front and never broken: **never touch backend logic — AI/RAG/retrieval/
embeddings/vector-store/APIs/auth-logic/OCR/verification-pipeline/DB schema. Only presentation.**
This is worth mentioning unprompted — it demonstrates working inside a hard constraint rather than
just "redesigning the UI."

That rule was re-verified twice with independent multi-agent adversarial code reviews (not just
"I looked at the diff and it seemed fine") — both came back clean on the backend-isolation check.

## The 12-phase structure

Work was explicitly phased, with a stop-and-summarize gate after each phase before moving to the
next — a deliberate choice to keep a large redesign reviewable in chunks rather than one giant
diff:

1. **Brand & logo** — a custom scales-of-justice SVG mark, indigo→violet gradient, used as
   favicon and in-app wordmark.
2. **Design system** — CSS custom-property tokens (HSL) for light/dark, semantic colors
   (success/warning/destructive/info distinct from the brand accent, not just brand-tinted greys),
   a full shadow/radius/font scale, self-hosted fonts (Plus Jakarta Sans + JetBrains Mono via
   `next/font`, no CDN dependency), and a primitive component layer (Button/Card/Badge/Dialog/etc)
   built on Radix UI + class-variance-authority.
3. **App shell** — desktop fixed sidebar + mobile slide-in drawer + a ⌘K command palette (`cmdk`).
4. **Landing page** — hero, problem→solution, how-it-works, feature grid, coverage grid, FAQ, all
   with scroll-triggered reveal animations.
5. **Auth/settings** — theme (light/dark/system), default-language preference (persisted to
   `localStorage`), Clerk-gated account controls.
6. **Analyzer composer** — drag-and-drop file upload, voice input toggle, ⌘/Ctrl+Enter to submit,
   auto-cycling pipeline-stage status while waiting (`AnalyzingState`).
7. **Report UI** — rebuilt the 14-section report as an executive dashboard: stat cards, a
   verification-verdict badge per law row, an action-plan card, a timeline stepper, Print/PDF
   export, and a plain-text Copy button.
8. **Responsive** — audited every breakpoint from 320px up; fixed specific overflow/tap-target
   issues found by review (not just "looks fine on my screen").
9. **Accessibility** — skip-to-content link, `<main>` landmark, ARIA labels on icon-only controls,
   `role="alert"` on errors, focus-visible rings audited across every interactive element, a
   hand-rolled mobile drawer later replaced with Radix Dialog specifically because it lacked a
   real focus trap.
10. **Motion** — staggered mount animations on the report, an animated pipeline stepper, hover
    micro-interactions — all gated behind `useReducedMotion()`, and the print stylesheet
    explicitly neutralizes any in-flight animation so a PDF can never be exported mid-transition
    (opacity 0).
11. **Performance** — code-splitting: the report view, the command palette, and *all* Clerk
    client-side code are behind `next/dynamic(..., { ssr: false })`, loaded only when actually
    needed. This cut First Load JS by 24–35% across the main routes (landing 212→154 kB, /chat
    165→126 kB, /settings 176→115 kB) without touching a single backend line.
12. **Final QA** — a full regression sweep: unit tests, typecheck, production build, a live smoke
    test hitting every route and both API contracts, plus a final adversarial review pass focused
    on "did anything in the previous 11 phases regress or leave something incomplete."

## The verification discipline (worth naming explicitly)

At two points in the redesign, an independent multi-agent review was run across seven-plus
dimensions (backend-isolation, reduced-motion compliance, print/PDF correctness, accessibility,
responsiveness, design-system consistency, runtime correctness) — each finding was then
**adversarially re-verified** by a second pass before being trusted, specifically to avoid acting
on a plausible-but-wrong finding. This mirrors the exact same "don't trust the first answer,
verify independently" philosophy used in the backend's grounding/verification design — it's a
consistent engineering value across the whole project, not just a backend-specific trick.

## Deployment

- **Docker**: a self-contained multi-stage image. Build stage: `npm ci` → `prisma generate` +
  `db push` → build the local vector index (`EMBED_PROVIDER=local VECTOR_STORE=local npm run
  ingest`) → `next build`. Runtime stage: copies only the built artifacts (`.next`, `data`,
  `prisma`, `node_modules`, `public`) — the only required runtime secret is a Gemini (or
  Anthropic) API key.
- **Host**: Railway, connected to a GitHub repo, builds directly from the Dockerfile.
- **A real bug hit and fixed during deployment**: the initial build failed because the Dockerfile
  copies `COPY --from=build /app/public ./public`, but the project never had a `public/`
  directory (the app uses only self-hosted fonts, no static assets) — Docker's `COPY` fails hard
  if the source path doesn't exist. Fixed by committing an empty `public/.gitkeep`. This is a good
  example to have ready if asked "tell me about a bug you fixed" — small, real, and shows you can
  read a build-daemon error message precisely (`"/app/public": not found`) rather than guessing.
