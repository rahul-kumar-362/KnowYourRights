# Interview Prep — Index

This folder is your prep kit for explaining **KnowYourRights (KYR)** in an interview: what it is,
how it works internally, why every major decision was made, and the exact questions an
interviewer is likely to ask (with answers you can defend under follow-up).

Read in this order if you're prepping from scratch; jump straight to file 5 if you just want
the Q&A bank.

| File | What's in it |
|---|---|
| [`01-project-overview-and-pitch.md`](01-project-overview-and-pitch.md) | 30-second, 2-minute, and 5-minute pitches. The problem, the user, the "so what". |
| [`02-architecture-and-rag-deep-dive.md`](02-architecture-and-rag-deep-dive.md) | The 4-call agent pipeline, RAG internals (chunking, embeddings, hybrid search), the grounding + verification mechanism — the technical heart of the project. |
| [`03-tech-stack-and-tradeoffs.md`](03-tech-stack-and-tradeoffs.md) | Every technology choice and *why*, plus the tradeoffs you made knowingly (local vs. managed, SQLite vs. Postgres, etc). |
| [`04-frontend-and-deployment.md`](04-frontend-and-deployment.md) | The 12-phase premium frontend redesign, design system, accessibility/perf work, and how it's deployed (Docker → Railway). |
| [`05-interview-QA-bank.md`](05-interview-QA-bank.md) | **The big one.** ~60 likely questions across project-overview, RAG/LLM-systems, system design, frontend, and behavioral — each with a model answer. |
| [`06-code-reference-cheatsheet.md`](06-code-reference-cheatsheet.md) | Exact file:line references so you can pull up real code live in an interview instead of describing from memory. |

## How to use this in an interview

1. **Lead with the pitch** (file 1) — establish what it does and why it's hard before diving into code.
2. **When asked "how does it work"** — walk the pipeline diagram in file 2, agent by agent.
3. **When asked "why X technology"** — you have a one-line justification *and* the tradeoff you accepted, from file 3. Interviewers respect "I chose X, knowing it costs me Y" far more than "X is just what I know."
4. **Never claim more than the code does.** Every fact in this folder was checked against the actual source (not just recalled from memory) at the time of writing — see the file:line references in file 6. If asked something this folder doesn't cover, say what you'd need to check rather than guessing.
