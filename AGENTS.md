# Budiman HRMS - Project Rules

## What this is
A Leave Request module for Budiman Company: an employee submits a leave request, their supervisor signs or rejects it, then an HR officer approves or rejects it. An admin sees everything but changes nothing. Full requirements: `docs/Agentic AI - HRMS Doc.pdf`.

## How we work (spec first)
- The three files in `docs/specs/` (requirements, design, tasks) are the source of truth. Build only from approved specs; if the app is wrong, fix the spec first, then rebuild.
- Build one task at a time in `03-tasks.md` order, High priority first, and mark a task Done when its checks pass. No invented features.

## Built with (fixed, do not change)
- Next.js 16 with TypeScript, React 19, Tailwind CSS 4; no new dependencies or version changes without asking.
- SQLite through Prisma (one file, no database server), passwords hashed with bcryptjs, login by signed session cookie, forms use server actions.
- Every action re-checks the user's role on the server, follows OWASP Top 10, and never stores or logs plain passwords or secrets. Demo accounts use the password `password123`.

## Where things live
- `docs/Agentic AI - HRMS Doc.pdf` - what to build, and the tables it needs (§7.2).
- `docs/templates/` - copy a template into `docs/specs/`; never overwrite an existing spec, add to it instead.
- `src/app/` - the whole app: pages and server actions (still just a placeholder).

## Run it
- `npm install`, then `npm run dev` at http://localhost:3000 (Node 20.9+). `npm run lint` must pass before a task is Done.

## Commits
- Every commit message uses Conventional Commits: `feat: add login page`, `fix: block HR pages for employees`, `docs: update design spec`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
