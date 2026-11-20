# Login & Access – Tasks

> **This file answers:** In what order do we build it, and how do we check each step?
> **Who:** The AI drafted it. You review it.
>
> Build one task at a time, in order. When a task is done, the AI changes its
> Status to Done. At the end, you check the whole app against the specs.
> If something is wrong, fix the spec first, then ask the AI to rebuild.

**Priority.** Every task is **High**, **Medium** or **Low**. Do High first.
Do Low only if time is left, and only if you ask.

The rows below are in build order: the database comes first, then login, then
the smaller additions. Task 10 (the full check) runs last on purpose, even
though tasks 7–9 are Medium — it re-checks everything at once.

| Status | # | Task | Priority | Checks (from requirements §4) |
|--------|---|------|----------|-------------------------------|
| Done | 1 | Database + Users table | High | (design §1 — see task) |
| Done | 2 | Seed the six demo users | High | AC-11, AC-15 |
| Done | 3 | Session cookie library | High | (design rules 4–5 — see task) |
| Done | 4 | Role home pages + protected layout | High | AC-06 |
| Done | 5 | Login form + login action | High | AC-01…05, AC-07, AC-13 |
| Done | 6 | Log out + `/` redirect | High | AC-09, AC-10 |
| Done | 7 | Lockout after failed logins | Medium | AC-12 |
| Done | 8 | Admin resets a password | Medium | AC-08, AC-14 |
| Done | 9 | `proxy.ts` optimistic redirects | Medium | AC-06, AC-07 (faster path) |
| Done | 10 | Full spec check + lint | High | AC-01…AC-15, `npm run lint` |

---

## Task 1 – Database + Users table *(High)*

> One task = one small step you can finish and test on its own.

- **Goal:** Prisma is wired to a SQLite file, and `dev.db` has the `User` table with the `Role` enum exactly as design §1.
- **Files:** `prisma/schema.prisma`, `.env` (`DATABASE_URL="file:./dev.db"`), `.gitignore` (new: `node_modules/`, `.next/`, `dev.db`, `.env`, `.env.local` — the starter has none yet), then run `npx prisma migrate dev --name init`.
- **Traces:** design §1 (`User` table), §3 (SQLite + Prisma), §7 (migrate command).
- **Check:** `npx prisma migrate dev --name init` finishes without error; `npx prisma studio` opens and shows the `User` table with all 9 fields (`id`…`createdAt`); try two rows with the same `email` in Studio — the second is refused (email unique), and same for `icNo`; the `Role` field offers exactly EMPLOYEE, SUPERVISOR, HR, ADMIN.

## Task 2 – Seed the six demo users *(High)*

- **Goal:** `npm run db:seed` puts the six Reference B users into the database, passwords bcrypt-hashed, and can be re-run safely.
- **Files:** `prisma/seed.ts` (run with `tsx`), `package.json` (`db:seed` script + `prisma.seed` config — no new dependencies).
- **Traces:** U6; AC-11, AC-15; design rule 10.
- **Check:** delete `dev.db`, re-run `npx prisma migrate dev --name init`, then `npm run db:seed` → Studio shows exactly the six Reference B users. Run `npm run db:seed` again → still six rows, no duplicate error. `npx prisma studio` (or `sqlite3 dev.db "SELECT email, password FROM Users"`) → every `password` starts with `$2a$` and nowhere in the file is the text `password123`.

## Task 3 – Session cookie library *(High)*

- **Goal:** One module can create a signed 8-hour `hrms_session` cookie, verify one (rejecting tampered or expired tickets), read the user behind it, and destroy it — used by every later task.
- **Files:** `src/lib/session.ts`, `src/lib/db.ts`, `.env.local` (`SESSION_SECRET=…`), `.env.example` (placeholder, committed).
- **Traces:** design rules 4, 5, 11; U2, U5, U7; AC-13 (flags set here).
- **Check:** run a throwaway `npx tsx` script that: (a) signs a ticket for a real seeded user and `getSessionUser()` returns that user; (b) a ticket with one byte of the payload changed is rejected; (c) a ticket made with `maxAge = -1` is rejected; (d) `requireUser('EMPLOYEE')` for an HR ticket says no; (e) with `SESSION_SECRET` unset, creating a session throws instead of using a default. Then `npm run lint` passes.

## Task 4 – Role home pages + protected layout *(High)*

- **Goal:** The four home pages and the shared header exist, and every one of them turns a visitor with no (or a broken) session away to `/login`.
- **Files:** `src/app/(protected)/layout.tsx` (calls `requireUser`), `src/app/(protected)/employee/page.tsx`, `.../supervisor/page.tsx`, `.../hr/page.tsx`, `.../admin/page.tsx` (shells with role badge and name).
- **Traces:** U3; AC-06; design §4, rule 5–6.
- **Check:** with a private window (logged out), type `/employee`, `/supervisor`, `/hr`, `/admin` in the address bar → each redirects to `/login`. Paste a made-up value into the `hrms_session` cookie in DevTools → still redirected to `/login`. `/login` itself shows a "coming in Task 5" empty card (no 404).

## Task 5 – Login form + login action *(High)*

- **Goal:** A real login form at `/login` signs in the six demo users and bounces everyone else, per the interview answers.
- **Files:** `src/app/login/page.tsx`, `src/app/login/login-form.tsx` (`'use client'`, `useActionState`), `src/app/actions/auth.ts` (`login`: field validation, bcrypt compare, cookie, redirect).
- **Traces:** U1, U2, U4; AC-01, AC-02, AC-03, AC-04, AC-05, AC-07, AC-13; design §4, rules 2–3.
- **Check:** AC-01 — sign in as each of the six demo users → each lands on its own home (`/employee`, `/supervisor`, `/hr`, `/admin`). AC-02/03 — `employee-1` + `wrongpass`, and `nobody@budiman.com` + `password123` → identical "Invalid email or password". AC-04 — `wee@gmail.com` → "Use your @budiman.com work email". AC-05 — empty fields and `wee@budiman` → per-field errors. AC-07 — sign in as `employee-1`, then type `/hr` → bounced to `/employee`. AC-13 — DevTools → the `hrms_session` cookie is `HttpOnly`, `SameSite=Lax`, expires in about 8 hours.

## Task 6 – Log out + `/` redirect *(High)*

- **Goal:** A Log out button in the header ends the session everywhere, and `/` and `/login` always send a logged-in user to their own home.
- **Files:** `src/app/(protected)/layout.tsx` (header button → form), `src/app/actions/auth.ts` (`logout` action), `src/app/page.tsx`.
- **Traces:** U2, U5; AC-09, AC-10; design §4, rule 6.
- **Check:** AC-09 — as `hr-1`, the header shows the Log out button on every page → click → `/login` → press the browser Back button → `/hr` does not show data, redirects to `/login`. AC-10 — logged in as `hr-1`, type `/login` and then `/` → both end at `/hr`.

## Task 7 – Lockout after failed logins *(Medium)*

- **Goal:** Five consecutive failures on one email block logins for that email for 15 minutes with "Too many attempts, try again later".
- **Files:** `src/lib/lockout.ts`, `src/app/actions/auth.ts` (`login` consults and updates the counter).
- **Traces:** U8; AC-12; design rule 8.
- **Check:** fail 5 times with `employee-1@budiman.com` / `wrongpass` → 6th attempt with the **correct** password → "Too many attempts, try again later". `hr-1@budiman.com` / `password123` still works during the block. Restart `npm run dev` → `employee-1` can log in again.

## Task 8 – Admin resets a password *(Medium)*

- **Goal:** On `/admin`, an Admin sees the users list and can reset any user to `password123` behind a confirmation; nobody else's cookie can trigger it.
- **Files:** `src/app/(protected)/admin/page.tsx` (users list + Reset password button with confirm), `src/app/actions/auth.ts` (`adminResetPassword`: `requireUser('ADMIN')` first, then bcrypt-hash `password123`, success message).
- **Traces:** U9; AC-08, AC-14; design rule 9.
- **Check:** AC-14 — log in as `admin@budiman.com`, click Reset password on `employee-1`, confirm, success message shows; `employee-1` logs in with `password123`. Log in as `employee-1` → no reset control visible. AC-08 — with only an employee session cookie, POST the reset action by hand (curl) → refused, and the target's password still works.

## Task 9 – `proxy.ts` optimistic redirects *(Medium)*

- **Goal:** Before a protected page even renders, a visitor with no cookie is sent to `/login` and a wrong-role user to their own home — the page check of Task 4 stays the real guard.
- **Files:** `proxy.ts` (matcher for `/employee`, `/supervisor`, `/hr`, `/admin`, `/login`, `/`), using the verify function from `src/lib/session.ts`.
- **Traces:** design rule 7 (proxy is a shortcut, never the only guard); supports U3, AC-06, AC-07.
- **Check:** logged out → `/hr` redirects to `/login` *before* any protected content renders (view-source shows no page HTML for `/hr`). Employee session → `/admin` redirects to `/employee`. Then prove the page check still guards: temporarily set the proxy matcher to `[]` → Task 4's and Task 5's AC-06/AC-07 checks must **still** pass; restore the matcher afterwards.

## Task 10 – Full spec check + lint *(High)*

- **Goal:** The whole module is walked through the requirements' acceptance table end to end, exactly as a reviewer would, with lint clean.
- **Files:** none new — `docs/specs/01-requirements.md` §4 table statuses get ticked, and this file's statuses go to Done.
- **Traces:** FR-01, FR-10; every AC; `AGENTS.md` ("`npm run lint` must pass before a task is Done").
- **Check:** from a clean state (delete `dev.db` → Task 1 migrate → `npm run db:seed`), run **every** row AC-01…AC-15 of requirements §4 by hand and tick each. `npm run lint` exits with no errors. No password ever appears in the dev terminal or the cookie value (AC-15).
