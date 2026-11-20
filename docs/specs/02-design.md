# Login & Access – Design

> **This file answers:** How is the app put together? (data, rules, screens,
> where the code lives)
> **Who:** The AI drafted it. You review all of it.
>
> If this file and the requirements disagree, fix the requirements first,
> then this file.
>
> Scope: implements `01-requirements.md` U1–U11 (login, sessions, role access,
> seed, Admin password reset, change my password, header user menu). The
> leave-request module will extend this file later.

## 1. Tables

### `User` – one row per person who can log in

SQLite via Prisma; the database is one file, `dev.db`, in the project root
(connection string `DATABASE_URL="file:./dev.db"` in `.env`).

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row (autoincrement) |
| `name` | text | yes | Full name, as shown in the header |
| `icNo` | text | yes | Identity card number, format `xx-xxxxxx` (e.g. `00-148888`). Unique |
| `email` | text | yes | Work email, always lower-case, always ends `@budiman.com`. Unique — this is the login identity |
| `password` | text | yes | bcrypt hash (bcryptjs, cost 10). Never plain text, never shown or logged |
| `role` | enum `Role` | yes | One of `EMPLOYEE`, `SUPERVISOR`, `HR`, `ADMIN` — one role per user |
| `division` | text | yes | Must be one of the fixed divisions in Reference A (picked in code, not a table — no division editing in this module) |
| `designation` | text | yes | Must be one of the designations listed under that user's division in Reference A |
| `createdAt` | date | auto | Set by the seed / insert, not editable |

Notes:

- Emails are trimmed and lower-cased **before** any lookup or insert, so `Employee-1@Budiman.COM` logs in as `employee-1@budiman.com` (U1, AC-01).
- Format checks (`xx-xxxxxx`, `@budiman.com` suffix, Reference A choices) are enforced in the seed script, since login never writes users.
- The session itself is **not** a table: it is a signed cookie (see Business rule 4). No device tracking, matching "Not included" in the requirements.

## 2. Business rules

1. **Only staff log in.** Access needs a valid session cookie. There is no sign-up page; users arrive only from `prisma/seed.ts`.
2. **Email is the login identity.** Stored lower-case and unique; must be well-formed and end with `@budiman.com` — checked in the login action before any credential check, with the hint "Use your @budiman.com work email" (U4, AC-04).
3. **One generic failure.** Unknown email and wrong password both answer "Invalid email or password", with the same timing path (always run a bcrypt compare). Never say which part was wrong (U4, AC-02/03).
4. **The session is a signed cookie, not a lookup table.** Cookie `hrms_session` holds `userId`, `role` and an 8-hour expiry, as base64url JSON plus an HMAC-SHA256 signature keyed by `SESSION_SECRET`. It is `httpOnly`, `sameSite=lax`, `path=/`, no `maxAge` beyond 8 hours, and never contains the password. Flags: `secure` is off on plain-HTTP localhost dev and on when served over HTTPS.
5. **Pages and actions ask the database, not just the cookie.** `requireUser()` verifies the signature and expiry, then loads the user by id and checks the role against the database — so a changed role or deleted user loses access even with an unexpired cookie.
6. **Wrong door, back to your own.** No session → `/login`. Right session, wrong role → that user's own home page. Never 404, never "Access denied" (U3, AC-06/07).
7. **Proxy is only a shortcut.** `proxy.ts` redirects obvious cases before rendering; every page layout and every server action repeats the check. Proxy is never the only guard (Next docs: proxy is not full auth).
8. **Five tries, then cool down.** Per email: 5 consecutive failures block that email's logins for 15 minutes with "Too many attempts, try again later". The counter is in-memory (a `Map` on the server); restarting `npm run dev` clears it (U8, AC-12). Correct passwords during the block are also refused, so guessing gets no signal.
9. **Admin's one exception.** Admin can see everything and change nothing, **except** one action: "Reset password", which sets any one user's password to `password123` (bcrypt-hashed). It always resets to that fixed value — Admin never types a new password — asks for confirmation first, and shows a success message afterwards (doc §5.3.6/7, U9).
10. **Seed is the only writer.** `npm run db:seed` upserts the six demo users of Reference B by email: re-running never duplicates, and restores `password123` on all six.
11. **No secrets in the wrong place.** `SESSION_SECRET` lives in `.env.local` (git-ignored); a placeholder `.env.example` is committed. Passwords and secret values are never printed by the dev server, never put in a cookie, and never sent to the browser.
12. **Your password is yours to change.** Any signed-in user may replace **their own** password from a card on their home page: they type the current password (bcrypt-compared) and the new one twice. Server-side rules: all three fields required, new password at least 8 characters, the two new entries identical, and the new password different from the current one (U10, AC-16…AC-19). The form carries no user id — the action changes exactly the session user, never anyone else. The session stays valid after the change (rule 4: there is no per-device store to revoke; rule 5 still re-reads the user each request).

## 3. Technology

Everything is fixed by doc §7.1 and `AGENTS.md` — no new dependencies.

| Part | Choice | In plain words |
|------|--------|----------------|
| Web framework | Next.js 16 (App Router, TypeScript) | Screens and server logic in one project. Forms post to Server Actions |
| Database | SQLite + Prisma 6 (`dev.db`) | One file, no server. `prisma/schema.prisma` defines `User` |
| Styling | Tailwind CSS 4 | Styles sit next to each screen |
| Password hashing | bcryptjs 3 (cost 10) | Hashes at seed; `bcrypt.compare` at login and at Admin reset |
| Session | Signed cookie via Node's built-in `crypto` (HMAC-SHA256), written with `cookies()` from `next/headers` | Tamper-evident ticket naming the user, expires in 8 h. No auth library, no new packages |
| Mutations | Server Actions (`'use server'`) — login, logout, admin reset | No separate API to design; validation runs on the server |
| Optimistic redirect | `proxy.ts` (Next 16's name for middleware) | Bounces the obvious "no cookie / wrong role" visits before the page renders |

## 4. Screens (routes)

The layout under `(protected)` runs the check of rule 5 on every request; the action files run it again on every submit.

| Route | Who | What it shows | Status |
|-------|-----|---------------|--------|
| `/` | Anyone | No page of its own: logged in → redirect to own home; logged out → `/login` (U2, AC-10) | To do |
| `/login` | Logged out | Card with email + password fields, Sign in button, per-field and generic errors, lockout message. Already logged in → redirect to own home. No password hint shown. | To do |
| `/employee` | Employee | Home-page shell for the employee (leave features come in the next spec) | To do |
| `/supervisor` | Supervisor | Home-page shell for the supervisor | To do |
| `/hr` | HR | Home-page shell for HR | To do |
| `/admin` | Admin | Home-page shell + the users list (name, email, role, division) with one **Reset password** button per row: confirm → action → success message (U9) | To do |
| *(action)* `logout` | Logged in | The Log out item of the header user menu posts the `logout` action: deletes the cookie, redirects to `/login` (U5). Not a GET route, so the Back button cannot revive it. | To do |
| `/change-password` | Logged in (any role) | Change my password form: current password + new password typed twice + Change password button; field errors, "Current password is incorrect", and a success message (U10, rule 12). Reached from the header user menu; the layout's `requireUser()` guard applies. | To do |

Every protected page shares one layout: Budiman HRMS bold white on the left, and on the right the **user menu** (U11): a trigger pill with the user's name, role badge and a chevron; clicking opens a glass dropdown with **Change password** (link to `/change-password`) and **Log out** (posts the logout action). It closes on outside click and Escape.

### 4.1 The look — "Liquid Glass"

Visual reference: `images/1000_F_1904220374_hNtJ3234qGrKZ9l5Uh4M3OvOHbMqrLgY.jpg` (the
"Liquid Glass" variant of the three shown — decided 2026-11-20; the Dark and Light variants
of the same picture are not used). This section changes **appearance only** — routes, checks,
messages, accessible names and behaviour stay exactly as specified above and in §2/§6.

- **Page background (every screen, login and protected alike):** one full-screen diagonal
  gradient, teal at the top-left → mid blue → deep navy bottom-right
  (≈ `bg-gradient-to-br from-teal-700 via-cyan-900 to-blue-950`). Content sits centred on it.
- **Cards (login card, home cards, users list):** "liquid glass" — translucent white fill
  (`bg-white/10`), frosted blur behind (`backdrop-blur-md`), 24 px corners (`rounded-3xl`),
  hairline light edge (`border border-white/20`), soft shadow, inner padding 32 px (`p-8`),
  max width 448 px (`max-w-md` for the login card; the admin users card stretches wider,
  `max-w-3xl`).
- **Headings:** white, bold, centred — "Sign in" / "Welcome, {name}" (`text-2xl`/`text-3xl`).
- **Inputs:** full-width **pills** (`rounded-full`), translucent white fill (`bg-white/15`),
  white text, dim-white placeholder (`placeholder-white/60`), comfortable height (≈ 44 px,
  `py-2.5 px-5`), 16 px between fields (`space-y-4`). The field's visible text is the
  placeholder ("Work email", "Password") like the reference; the `<label>` remains the
  accessible name (visually hidden, still readable by screen readers and by the hand-tests
  that fill "Work email").
- **Primary button:** full-width blue **pill** (`bg-blue-600 hover:bg-blue-500 text-white
  font-semibold rounded-full py-2.5`), 8 px below the last input — matches the reference's
  blue "Sign in". Disabled while the action is pending (`disabled:opacity-60`).
- **Messages:** shown in the reference's "Forgot Password?" slot — small, bold, centred under
  the button: red family (`text-rose-200`) for errors/lockout/generic failure, green family
  (`text-emerald-200`) for success (e.g. "Password reset for …"). Per-field errors appear
  right under their input in `text-rose-200 text-xs`.
- **Reference texts deliberately NOT copied:** "Forgot Password?" and "Don't have account?
  Sign up" stay out — password recovery is the Admin-reset exception (rule 9) and accounts
  come only from the seed (rule 10); dead links would be invented features.
- **Protected shell:** the same gradient fills the viewport; the header becomes a glass bar
  (`bg-white/10 backdrop-blur-md border-b border-white/15`) with "Budiman HRMS" in bold
  white, and on the right the **user menu** (U11): the trigger is a
  `bg-white/15 hover:bg-white/25 text-white rounded-full` pill showing the name, the role
  badge as a white/20 inner pill, and a small chevron; the opened menu is a glass panel
  (`absolute right-0 mt-2 w-44 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md
  shadow-2xl`) whose white items highlight on hover (`hover:bg-white/10`): Change password →
  `/change-password`, and Log out. The header carries `relative z-50` so the open menu floats
  **above** the page's own glass cards — frosted (`backdrop-blur`) cards create their own
  stacking contexts, and without the raised header the menu paints behind them (seen
  2026-11-20: "top menu dropdown cannot be seen"). Home-page cards
  and the Admin users table reuse the glass card recipe; table text is white, row borders
  `border-white/15`, and the per-row **Reset password** button is a small blue pill
  (`bg-blue-600 hover:bg-blue-500 rounded-full text-xs`).

## 5. Where the code lives

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | `User` model, `Role` enum, SQLite datasource |
| `prisma/seed.ts` | The six Reference B users, hashed passwords, upsert by email (run with `tsx`) |
| `dev.db` | The SQLite file (git-ignored) |
| `.env` / `.env.example` | `DATABASE_URL`, `SESSION_SECRET`; only `.env.example` is committed |
| `package.json` | Adds the `db:seed` script (`prisma db seed` → `tsx prisma/seed.ts`) — no new dependencies |
| `src/lib/db.ts` | One shared `PrismaClient` |
| `src/lib/reference-data.ts` | The fixed division/designation lists of Reference A |
| `src/lib/session.ts` | Create/verify/destroy the `hrms_session` cookie; `getSessionUser()`; `requireUser(role)` for layouts and actions (rule 5) |
| `src/lib/lockout.ts` | The in-memory failed-attempt counter of rule 8 |
| `src/app/actions/auth.ts` | Server Actions: `login`, `logout`, `adminResetPassword`, `changePassword` — each re-checks role/session on the server (AC-08, AC-19) |
| `proxy.ts` | Optimistic redirects only (rule 7): no cookie → `/login`; cookie + wrong role → own home. Matcher covers the four homes, `/change-password`, `/login` and `/` |
| `src/app/page.tsx` | Redirect logic for `/` |
| `src/app/login/page.tsx` | The login screen (server component) |
| `src/app/login/login-form.tsx` | `'use client'` form with `useActionState` for field errors and the generic message |
| `src/app/(protected)/layout.tsx` | Session check + header with the user menu; wraps all four homes and `/change-password` |
| `src/app/(protected)/user-menu.tsx` | `'use client'` header dropdown: name/role/chevron trigger → **Change password** link + **Log out** (U11) |
| `src/app/(protected)/change-password/page.tsx` | The Change password page (`requireUser()` — any role — + glass card) (U10) |
| `src/app/(protected)/change-password/form.tsx` | `'use client'` change-my-password form with `useActionState` (U10) |
| `src/app/(protected)/employee/page.tsx` | Employee home shell |
| `src/app/(protected)/supervisor/page.tsx` | Supervisor home shell |
| `src/app/(protected)/hr/page.tsx` | HR home shell |
| `src/app/(protected)/admin/page.tsx` | Admin home shell + users list with Reset password |

## 6. Security (in plain words)

- **Every page** under `(protected)` runs `requireUser(role)`: valid signature, not expired, user still in the database, role allowed for that page. Wrong → redirect per rule 6. `/change-password` runs `requireUser()` with **no** role argument — any signed-in role may change their own password, and nobody who is not signed in ever reaches it.
- **Every server action** runs the same check again before touching data — `login` checks the lockout and credentials, `logout` requires a session, `adminResetPassword` requires the ADMIN role on the server, so hand-crafting a POST with an employee cookie does nothing (AC-08).
- **Passwords**: bcrypt hash in the DB only; compare with `bcrypt.compare`; never logged by the dev server, never included in cookies or error messages (AC-15, OWASP A02).
- **Change my password** (rule 12): needs a live session **and** the correct current password; the form holds no user id, so a hand-crafted POST can only ever rewrite the session user's own hash (AC-19, OWASP A01).
- **Authentication failures**: generic message, bcrypt compare always runs, per-email lockout (OWASP A07, AC-02/03/12).
- **Access control**: checks are server-side only; hiding buttons is a courtesy, never the control (OWASP A01).
- **Session cookie**: `httpOnly` keeps it out of page scripts (XSS), `sameSite=lax` blunts cross-site POSTs, 8-hour expiry limits a lost laptop, HMAC-SHA256 from `SESSION_SECRET` makes tampering fail closed (AC-13).
- **Secrets**: `SESSION_SECRET` only in `.env.local`, git-ignored; app refuses to sign sessions if it is missing rather than using a default.

## 7. Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install the pinned dependencies |
| `npx prisma migrate dev --name init` | Create `dev.db` and the `User` table from the schema |
| `npm run db:seed` | Load/refresh the six demo users (rule 10, AC-11) |
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run lint` | Must pass before a task is Done (`AGENTS.md`) |

---

# Reference

## Reference A. Fixed lists (from doc §7.2 — validation lists, not tables)

- **Divisions & designations:**
  - Finance — Finance Manager, Accountant, Accounts Clerk
  - Human Resources — HR Manager, HR Officer, HR Assistant
  - Information Technology — IT Manager, Software Developer, IT Support Officer
  - Operations — Operations Manager, Operations Supervisor, Operations Executive
  - Marketing — Marketing Manager, Marketing Executive, Marketing Assistant
  - Admin — Admin Manager *(division used only by the admin demo account)*
- **Roles:** EMPLOYEE, SUPERVISOR, HR, ADMIN
- **Login password (demo only):** `password123`

## Reference B. Demo data (seeded by `prisma/seed.ts`, from doc §7.2)

| Email | Name | IC No. | Role | Division | Designation |
|-------|------|--------|------|----------|-------------|
| `employee-1@budiman.com` | Employee 1 | 00-148888 | Employee | Finance | Accounts Clerk |
| `supervisor-1@budiman.com` | Supervisor 1 | 00-157777 | Supervisor | Finance | Finance Manager |
| `supervisor-2@budiman.com` | Supervisor 2 | 00-166666 | Supervisor | Finance | Accountant |
| `hr-1@budiman.com` | HR 1 | 00-175555 | HR | Human Resources | HR Officer |
| `hr-2@budiman.com` | HR 2 | 00-184444 | HR | Human Resources | HR Officer |
| `admin@budiman.com` | Admin | 00-193333 | Admin | Admin | Admin Manager |

All six log in with `password123` (stored bcrypt-hashed). Names and IC numbers are made up.
