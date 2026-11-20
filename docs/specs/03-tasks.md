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
though tasks 7–9 are Medium — it re-checks everything at once. Tasks 11 and
12 arrived later, with U10 and U11 (2026-11-20): they build after Task 10
and tick their own AC rows and lint when done.

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
| Done | 11 | Change my password | Medium | AC-16…AC-19, `npm run lint` |
| Done | 12 | Header user menu + `/change-password` page | Medium | AC-09, AC-16 (via page), AC-19, AC-20, `npm run lint` |

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

## Task 11 – Change my password *(Medium)*

- **Goal:** Every signed-in user can replace their own password from a card on their home page: current password required (bcrypt-compared), new one typed twice, all rules checked on the server (design rule 12).
- **Files:** `src/app/actions/auth.ts` (`changePassword`: `requireUser()` first — no role argument, any signed-in user; validate, compare current, hash the new one), `src/app/(protected)/change-password-form.tsx` (`'use client'`, `useActionState`, Liquid Glass look of §4.1), `src/app/(protected)/layout.tsx` (mount the card under `{children}` so all four roles get it).
- **Traces:** U10; AC-16…AC-19; design rule 12, §4 (shared card), §6.
- **Check:** run AC-16…AC-19 of requirements §4 in order (restore the demo password afterwards with `npm run db:seed`). The card's HTML holds only the three password fields — no user id (AC-19). `npm run lint` exits with no errors.

## Task 12 – Header user menu + `/change-password` page *(Medium)*

- **Goal:** The header's account actions move into a dropdown: a pill with name + role badge + chevron opens a glass menu with **Change password** (navigates to the new `/change-password` page, which hosts the Task 11 form) and **Log out** (the same `logout` action). Outside click and Escape close it.
- **Files:** `src/app/(protected)/user-menu.tsx` (new, `'use client'`), `src/app/(protected)/change-password/page.tsx` (new, `requireUser()` with no role + glass card), `src/app/(protected)/change-password/form.tsx` (relocated from `change-password-form.tsx`, minus the card chrome), `src/app/(protected)/layout.tsx` (render `UserMenu`; drop the mounted card), `src/proxy.ts` (add `/change-password` to the matcher and the protected prefixes).
- **Traces:** U5, U10, U11; AC-09, AC-16 (via the page), AC-19, AC-20; design §4, §4.1, §5, §6; rule 7 (proxy covers the new route).
- **Check:** AC-20 — sign in, the pill opens the menu; Change password → `/change-password` renders the form; outside click and Escape close it; Log out → `/login`. AC-16 — run the change flow on the new page (restore afterwards). AC-19 — logged out, `/change-password` redirects to `/login` (proxy, and again with the matcher temporarily `[]` to prove the page guard, as in Task 9). `npm run lint` exits with no errors.

---

# Leave Request – Tasks

> The rows below continue the numbering: Tasks 13–22 build the leave module
> from `01-requirements.md` U12–U19 and the Leave Request part of
> `02-design.md`. The Login & Access tasks above are Done and untouched.

**Priority.** Same rule as before: High first. The order below is the build
order: the database comes first (Task 13), then the flow follows the workflow —
submit → employee list → supervisor sign → supervisor reject → send to HR → HR
decide — then the two Medium extras (Task 20 guardrails, Task 21 Admin list),
and Task 22 (the full check) runs last on purpose even though 20–21 are Medium,
exactly as Task 10 did.

Confirm-before-action and the success message (FR-07, design LR-11) are built
into every action task, not a task of their own; Task 22 re-checks AC-35 across
all six actions at once.

| Status | # | Task | Priority | Checks (from requirements §4) |
|--------|---|------|----------|-------------------------------|
| Done | 13 | Database + LeaveRequest table | High | (design §1 — see task) |
| Done | 14 | Leave form + submit action | High | AC-21 (row created), AC-22…24, AC-35 (submit) |
| Done | 15 | My requests list (employee) | High | AC-21 (list), AC-33 (employee part) |
| Done | 16 | Supervisor queue + Sign | High | AC-21 (queue half), AC-26, AC-28 (visibility), AC-33 (supervisor part), AC-35 (sign) |
| Done | 17 | Supervisor Reject + remark | High | AC-27, AC-28 (cookie POST), AC-35 (reject) |
| Done | 18 | Send to HR | High | AC-29, AC-30, AC-35 (send) |
| Done | 19 | HR queue + Approve/Reject + first-decision-wins | High | AC-31, AC-32, AC-33 (HR part), AC-35 (HR actions) |
| Done | 20 | Submission guardrails | Medium | AC-25, AC-23 (Other reason, final check) |
| Done | 21 | Admin All-leave list | Medium | AC-34 |
| Done | 22 | Full spec check + lint | High | AC-21…AC-35, `npm run lint` |
| Done | 23 | New Request button + form on its own page | High | AC-36, AC-21 (form half on the new page), AC-22…24 regression, AC-35 (submit) |

---

## Task 13 – Database + LeaveRequest table *(High)*

> One task = one small step you can finish and test on its own.

- **Goal:** The `LeaveRequest` model exists in `dev.db` exactly as design §1: all 14 fields, the `LeaveType` and `LeaveStatus` enums, the FKs to `User`, and the three indexes.
- **Files:** `prisma/schema.prisma` (new model + two enums + the three named back-relations on `User`: `submittedRequests`, `supervisedRequests`, `hrDecisions` — design §1 note), then run `npx prisma migrate dev --name leave_request`.
- **Traces:** design §1 (`LeaveRequest`, `LeaveType`, `LeaveStatus`, relations note), §3 (LR-8 timestamps), §7 (migrate command).
- **Check:** `npx prisma migrate dev --name leave_request` finishes without error; `npx prisma studio` shows `LeaveRequest` with the 14 fields from design §1; the `leaveType` dropdown offers exactly the five doc §7.2 types and `status` exactly the six states; `User` shows the three back-relations. Existing `User` data is untouched (the six demo users still log in). `npm run lint` passes.

## Task 14 – Leave form + submit action *(High)*

- **Goal:** The employee home gains the **New leave request** card: type select, the Other-only reason field, start/end dates, and a supervisor select holding only supervisors of the employee's own division; submitting runs confirm → server validation → insert as `PENDING_SUPERVISOR` → success message (FR-02).
- **Files:** `src/app/actions/leave.ts` (`submitLeaveRequest`: `requireUser('EMPLOYEE')`, division-supervisor check LR-2, date checks LR-5, enum checks, `submittedAt`), `src/app/(protected)/employee/leave-form.tsx` (new, `'use client'`, `useActionState`, per-field errors, confirm before submit), `src/app/(protected)/employee/page.tsx` (mount the card).
- **Traces:** U12; AC-21…24, AC-35 (submit row); design §1, LR-1/2/3/5, §4 (employee card), §6.
- **Check:** AC-21 (row-created half) — as `employee-1`: fill the form (Annual leave, tomorrow → +3 days, Supervisor 1) → confirm → success; the row exists as "Pending supervisor" (verify in Studio; its appearance in `supervisor-1`'s queue is confirmed in Task 16). AC-22 — empty form → four per-field errors; end before start → the date-order error; nothing saved. AC-23 — Other without reason refused; with reason accepted; reason field hidden for other types. AC-24 — picker shows only Supervisor 1 and 2; cookie POST with `hr-1`'s id as supervisor refused. AC-35 — dismissing the submit confirmation saves nothing. `npm run lint` passes.

## Task 15 – My requests list (employee) *(High)*

- **Goal:** Under the form, a **My requests** card shows the session user's own requests newest-first with type, "Start → End", a status badge, and remarks when present — the query filters by `employeeId = session user` (FR-06, employee part).
- **Files:** `src/lib/leave.ts` (status/type display labels; the employee query of LR-10), `src/app/(protected)/status-badge.tsx` (new, shared), `src/app/(protected)/employee/request-list.tsx` (new, `'use client'` — list shell for now; the Send button arrives in Task 18), `src/app/(protected)/employee/page.tsx` (mount it).
- **Traces:** U17; AC-21 (list half), AC-33 (employee row); design LR-10, §4 (My requests card), §4 badges.
- **Check:** after Task 14's submissions, `employee-1` sees own requests newest-first with correct badges and remarks. Do not create extra users — the six Reference B accounts stay the only users (rules 10/LR-13); verify privacy two ways instead: only rows with this employee's id appear, and a read of the query in `src/lib/leave.ts` shows the `employeeId` filter (the query is the control, LR-10). The Admin and supervisor pages show nothing new yet. `npm run lint` passes.

## Task 16 – Supervisor queue + Sign *(High)*

- **Goal:** `/supervisor` shows **Awaiting your signature** — only `PENDING_SUPERVISOR` rows naming the session supervisor — each with a **Sign** pill: confirm → action → success → row leaves the queue and becomes "Signed" (FR-03 first half). A **Your decided requests** card shows the rows naming them that have left the queue (everything except Pending supervisor — design §4).
- **Files:** `src/app/(protected)/supervisor/page.tsx` (the two cards), `src/app/(protected)/supervisor/queue.tsx` (new, `'use client'`, Sign form), `src/app/actions/leave.ts` (`supervisorDecide` — sign path: `requireUser('SUPERVISOR')`, row's `supervisorId = me`, status still `PENDING_SUPERVISOR`, set `signedAt`), `src/lib/leave.ts` (supervisor queries).
- **Traces:** U14, U17, U18; AC-26, AC-28 (visibility half), AC-33 (supervisor row), AC-35 (sign); design §2 table, LR-3/7/10/11, §4.
- **Check:** AC-21 (queue half) — the request submitted in Task 14 is present in `supervisor-1`'s queue with employee, type and dates. AC-26 — as `supervisor-1`, Sign the pending request → confirm → success; employee sees "Signed" (`signedAt` set — verify in Studio); row leaves the queue and appears in "Your decided requests". AC-28 (visibility) — a request naming Supervisor 1 never appears for `supervisor-2`. AC-33 (supervisor) — `supervisor-2`'s two cards show only rows naming them. AC-35 — dismissing the Sign confirmation changes nothing. `npm run lint` passes.

## Task 17 – Supervisor Reject + remark *(High)*

- **Goal:** Each queue row gains a remark input and a **Reject** pill: empty remark refused with "A remark is required"; with a remark, confirm → success → "Rejected by supervisor" (Final), remark visible to the employee (FR-03 second half).
- **Files:** `src/app/(protected)/supervisor/queue.tsx` (remark input + Reject), `src/app/actions/leave.ts` (`supervisorDecide` reject path: remark rule LR-4, status `REJECTED_SUPERVISOR`, `supervisorRemark` + `decidedAt`).
- **Traces:** U14, U17, U18; AC-27, AC-28 (cookie POST), AC-35 (reject); design §2, LR-4/7/11, §6.
- **Check:** AC-27 — Reject with empty remark refused (client and, via cookie POST, server); with a remark → confirm → success; the employee's list shows "Rejected by supervisor" with the remark. AC-28 — cookie POST Sign/Reject for a request naming Supervisor 1 with `supervisor-2`'s cookie → refused; `supervisor-1` confirms status unchanged. AC-35 — dismissing the Reject confirmation leaves the row Pending supervisor. `npm run lint` passes.

## Task 18 – Send to HR *(High)*

- **Goal:** A **Send to HR** pill appears on the employee's own `SIGNED` rows only: confirm → action → success → "Pending HR", and the request appears in **both** HR officers' view (FR-04).
- **Files:** `src/app/(protected)/employee/request-list.tsx` (Send button on SIGNED rows), `src/app/actions/leave.ts` (`sendToHr`: `requireUser('EMPLOYEE')`, row's `employeeId = me`, status `SIGNED` → `PENDING_HR`).
- **Traces:** U15, U18; AC-29, AC-30, AC-35 (send); design §2, LR-3/9/11.
- **Check:** AC-29 — as `employee-1`, Send to HR on the Signed request → confirm → success → "Pending HR"; visible in `hr-1`'s and `hr-2`'s queue queries (verify via Studio until Task 19 builds the HR page). AC-30 — no button on any non-SIGNED row; cookie POST for a `PENDING_SUPERVISOR` request refused; cookie POST with `supervisor-1`'s cookie refused (fails the EMPLOYEE role check and the ownership check). AC-35 — dismissing the confirmation leaves it Signed. `npm run lint` passes.

## Task 19 – HR queue + Approve/Reject + first-decision-wins *(High)*

- **Goal:** `/hr` shows the shared **Awaiting HR** queue with Approve and Reject(+remark) pills, and an **HR decisions** card naming the officer who decided. The first decision sticks; a second officer's stale page is refused with "Already decided by {name}" (FR-05).
- **Files:** `src/app/(protected)/hr/page.tsx` (two cards), `src/app/(protected)/hr/queue.tsx` (new, `'use client'`), `src/app/actions/leave.ts` (`hrDecide`: `requireUser('HR')`, status must still be `PENDING_HR` (LR-7), sets `hrOfficerId` (+`hrRemark`, Final) and `decidedAt`), `src/lib/leave.ts` (HR queries of LR-10).
- **Traces:** U16, U17, U18; AC-31, AC-32, AC-33 (HR row), AC-35 (HR actions); design §2, LR-3/4/7/8/10/11.
- **Check:** AC-31 — `hr-1` approves → confirm → success → "Approved"; `hr-2` rejects another: empty remark refused, with remark → "Rejected by HR", remark visible to the employee. AC-32 — with request X open in two browsers (hr-1 + hr-2): `hr-1` decides first; `hr-2`'s attempt shows "Already decided by HR 1" and Studio still shows `hrOfficerId` = hr-1. AC-33 (HR) — HR lists include only rows that reached the HR queue; a supervisor-rejected row never appears. AC-35 — dismissing HR confirmations changes nothing. `npm run lint` passes.

## Task 20 – Submission guardrails *(Medium)*

- **Goal:** The submit action also enforces the U13 extras: past start dates refused, overlap with the employee's own non-final requests refused, text fields capped at 500 chars, and a division with no supervisor gets the friendly empty-picker message.
- **Files:** `src/lib/leave.ts` (LR-5/4/6 validators + the empty-picker case), `src/app/actions/leave.ts` (call them in `submitLeaveRequest`), `src/app/(protected)/employee/leave-form.tsx` (picker-empty message; textarea `maxLength`).
- **Traces:** U13; AC-23 (final check), AC-25; design LR-4/5/6, §6.
- **Check:** AC-25 — start yesterday refused; overlapping an open request refused with the clear message; after a rejection the same dates submit fine; in Studio set `employee-1`'s division to Marketing → picker shows "No supervisor is available in your division — contact HR" → restore Finance in Studio (**the seed restores passwords, not the division** — design rule 10/LR-13) and confirm the picker lists both supervisors again. A 501-char remark/reason is refused by the server (cookie POST, since the client caps input at 500). `npm run lint` passes.

## Task 21 – Admin All-leave list *(Medium)*

- **Goal:** `/admin` gains the **All leave requests** card: every request with employee, division, type, dates, status, both remarks and deciding officer, newest submitted first — server-rendered, zero controls (FR-08).
- **Files:** `src/app/(protected)/admin/page.tsx` (second card + the Admin query of LR-10).
- **Traces:** U19; AC-34; design LR-10/12, §4 (admin card), §5.
- **Check:** AC-34 — as `admin`, the card lists every request with all columns and correct newest-first order; no buttons or inputs exist on it (inspect the HTML); cookie POST each leave action (sign, reject, send, approve) with the Admin cookie → refused; re-check statuses unchanged. The users card with Reset password still works (no regression). `npm run lint` passes.

## Task 22 – Full spec check + lint *(High)*

- **Goal:** The whole leave module is walked through requirements §4 end to end, exactly as a reviewer would — including the six-action confirm/success sweep — with lint clean and no login regression.
- **Files:** none new — `01-requirements.md` §4 (Leave part) statuses get ticked, and this file's Task 13–22 rows go to Done.
- **Traces:** FR-02…FR-08, FR-10; every leave AC; `AGENTS.md` ("`npm run lint` must pass before a task is Done").
- **Check:** from a clean state (delete `dev.db` → migrate init → migrate leave_request → `npm run db:seed`): run **every** row AC-21…AC-35 and tick each, ideally as one continuous story (employee submits → supervisor-1 signs → employee sends → hr-1 approves → admin sees it all). AC-35 sweep: dismiss then accept each of the six actions. Regression: AC-01 (six logins) and AC-11 (seed unchanged, still users-only) still pass. No remark or personal data printed to the dev terminal. `npm run lint` exits with no errors.

## Task 23 – New Request button + form on its own page *(High)*

> 2026-11-20 (user request, appended after the Done Task 22): the employee
> home page loses the New leave request card; the form moves to its own page.

- **Goal:** `/employee` shows only the welcome and My requests cards; the My requests card carries a blue **New Request** pill that opens `/employee/new-request`, which hosts the **New leave request** card (moved, unchanged behaviour) with a **Back to my requests** link.
- **Files:** `src/app/(protected)/employee/new-request/page.tsx` (new — `requireUser('EMPLOYEE')`, division supervisor query, the card + back link), `src/app/(protected)/employee/page.tsx` (form card and supervisor query removed, New Request pill added), `src/app/actions/leave.ts` (submit also revalidates `/employee/new-request`).
- **Traces:** U12; AC-36, AC-21…24 (regression on the new host page); design §4 (2026-11-20 note), §5.
- **Check:** AC-36 — `/employee` HTML has no leave form and a New Request link to `/employee/new-request`; the new page (as `employee-1`) renders the form and the Back link, and a `supervisor-1` cookie POST/GET of it bounces to `/supervisor`; submit from the new page creates the row (confirm → success) and `/employee` shows it (revalidation). Regression: check-task14 (form validations) re-run green. `npm run lint` passes.
