# Login & Access – Requirements

> **This file answers:** What should the app do, and why?
> **Who:** The AI drafted it from the interview and `docs/Agentic AI - HRMS Doc.pdf`. You review it.
>
> When the app's behaviour needs to change, update this file **first**.
>
> Scope: login for the four roles (doc §4, FR-01, FR-10). The leave request flow
> is specified later in this same file's style, not here.

## 1. The problem

Budiman Company is replacing a paper leave process with one system, and nothing in
the system is safe to expose until each of the 200 employees can only reach the
pages their role needs. Without login, employees could see others' requests, HR's
queue would have no owner, and the "only logged-in users" rule (doc §5.3.1) cannot
hold.

This module provides:

1. Login with work email (`@budiman.com`) and password, checked against hashed passwords.
2. One signed session cookie per login, lasting 8 hours, and a logout button.
3. Four role home pages, with pages and server actions re-checking the role on the server.
4. Failed-login handling that does not leak which accounts exist, plus a lockout after repeated failures.
5. The six demo accounts from doc §7.2, loaded by one seed command.
6. One scoped Admin action: reset a user's password back to `password123` (exception to "Admin is view only").

## 2. Who uses it (roles)

Routes below are the working names; the final routes are fixed in `02-design.md`.
Demo accounts and passwords: doc §7.2 — everyone logs in with their email and `password123`.

| Role | Home page | What they do |
|------|-----------|--------------|
| **Employee** | `/employee` | Logs in, lands on their home page, logs out. |
| **Supervisor** | `/supervisor` | Logs in, lands on their home page, logs out. |
| **HR** | `/hr` | Logs in, lands on their home page, logs out. |
| **Admin** | `/admin` | Logs in, lands on their home page, logs out; may reset another user's password to `password123` (the one exception to view-only). |
| **Anyone** | `/login` | Enters email and password; wrong role or no session gets bounced. |

## 3. User stories

- **U1. Log in** *(High)*. As a Budiman user, I can log in with my `@budiman.com` work email and my password so that only staff can use the system (doc §5.3.1, FR-01).
- **U2. Land on my role's home** *(High)*. As a logged-in user, I am taken to my own role's home page after login — and if I visit `/login` or `/` while already logged in, I am sent there instead — so that I start where my work is.
- **U3. Other roles' pages stay closed** *(High)*. As a user, I cannot open another role's pages: when logged out I am sent to `/login`, when logged in with the wrong role I am sent back to my own home page, and every page and server action re-checks my role on the server (FR-01, FR-10).
- **U4. Clear failures, no account leaks** *(High)*. As a user who mistypes their credentials, I get friendly field errors and one generic "Invalid email or password" message, so that nobody can discover which emails have accounts (OWASP A07).
- **U5. Log out** *(High)*. As a logged-in user, I can log out from a button in the header of every page so that the next person on my laptop is not signed in as me.
- **U6. Same demo accounts for everyone** *(High)*. As a developer or tester, I can load the six demo users with `npm run db:seed` so that everyone tests with the same logins (doc §7.2).
- **U7. Sessions expire** *(Medium)*. As a user, my session lasts 8 hours and then asks me to log in again, so that a forgotten-open laptop does not stay open forever.
- **U8. Lockout after guessing** *(Medium)*. As Budiman, the system blocks login for one email for 15 minutes after 5 consecutive failures, so that password guessing is slow (FR-10, OWASP A07).
- **U9. Admin resets a forgotten password** *(Medium)*. As an Admin, I can reset any user's password back to `password123` with a confirmation step, so that a forgotten password does not stop work. This is the only change an Admin can make (explicit exception to doc §5.3.6).

## 4. Acceptance checklist

Demo accounts (doc §7.2): `employee-1@budiman.com`, `supervisor-1@budiman.com`,
`supervisor-2@budiman.com`, `hr-1@budiman.com`, `hr-2@budiman.com`,
`admin@budiman.com` — all with password `password123`.

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| Done | AC-01 | All six demo accounts log in and land on their own role's home page (U1, U2) | • Go to `/login`<br>• Sign in as each of the six demo users, one by one<br>• Each should land on `/employee`, `/supervisor`, `/hr` or `/admin` matching their role |
| Done | AC-02 | Wrong password is rejected with the generic message (U1, U4) | • On `/login`, use `employee-1@budiman.com` with password `wrongpass`<br>• You should see "Invalid email or password", stay on `/login`, and `/employee` must still bounce you to `/login` |
| Done | AC-03 | Unknown email gets the same message as a wrong password (U4) | • On `/login`, use `nobody@budiman.com` with `password123`<br>• The message must be exactly the same as in AC-02 |
| Done | AC-04 | Emails outside `@budiman.com` are stopped with a friendly hint (U1, U4) | • On `/login`, enter `wee@gmail.com` and any password<br>• You should see a field error telling you to use your `@budiman.com` work email (no credential check happens) |
| Done | AC-05 | Empty and malformed fields show per-field errors (U4) | • Submit `/login` with both fields empty → both show "required" errors<br>• Enter `wee@budiman` → email format error |
| Done | AC-06 | Logged-out users cannot open protected pages (U3) | • Log out or use a private window<br>• Type `/hr` (and `/employee`, `/supervisor`, `/admin`) directly in the address bar<br>• Each should redirect to `/login` |
| Done | AC-07 | Wrong role is bounced to their own home, not shown or 404'd (U3) | • Log in as `employee-1@budiman.com`<br>• Type `/hr`, `/supervisor` and `/admin` in the address bar<br>• Each should redirect to `/employee` |
| Done | AC-08 | Server actions re-check the role, not just the pages (U3) | • Log in as `employee-1@budiman.com`<br>• Open DevTools → Application → Cookies: the session cookie is `HttpOnly` and `SameSite=Lax`<br>• Submit any Admin or HR-only form URL by hand (e.g. copy the Admin reset form's action URL, POST to it with `curl` while still holding only the employee cookie)<br>• The action must be refused on the server — no password reset happens (verify via AC-14 that the target's password still works) |
| Done | AC-09 | Logout works everywhere and cannot be walked back into (U5) | • On any page, the header shows a Log out button<br>• Click it → you land on `/login`<br>• Press the browser Back button → `/employee` (or any protected page) must not show data; it redirects to `/login` |
| Done | AC-10 | `/login` and `/` send logged-in users home (U2) | • Log in as `hr-1@budiman.com`<br>• Type `/login` and then `/` in the address bar<br>• Both should redirect to `/hr` |
| Done | AC-11 | `npm run db:seed` loads the six demo users and is safe to re-run (U6) | • Delete the SQLite file (path per `02-design.md`) and run `npm run db:seed`<br>• All six demo users exist and each logs in with `password123`<br>• Run `npm run db:seed` twice → still exactly six users, no duplicate error; a changed password (AC-12) is restored to `password123` |
| Done | AC-12 | 5 failed logins lock that email for 15 minutes (U8) | • On `/login`, fail 5 times in a row with `employee-1@budiman.com` / `wrongpass`<br>• The 6th try — even with the **correct** password — shows "Too many attempts, try again later"<br>• `hr-1@budiman.com` can still log in (lockout is per email)<br>• Restart `npm run dev` (or wait 15 min) → `employee-1` can log in again |
| Done | AC-13 | Sessions last 8 hours and carry secure flags (U7) | • Log in, open DevTools → Application → Cookies<br>• The session cookie is `HttpOnly`, `SameSite=Lax`, and its expiry is about 8 hours out<br>• Edit the expiry to a past time → visiting `/employee` redirects to `/login` |
| Done | AC-14 | Admin resets a password; nobody else can (U9) | • Log in as `employee-1@budiman.com` (works), then log out<br>• Log in as `admin@budiman.com`<br>• Choose `employee-1` → "Reset password" → confirm the prompt → a success message appears<br>• `employee-1` logs in again with `password123`<br>• Log in as `employee-1`: no reset control is visible, and the Admin reset URL/action refuses them (AC-08) |
| Done | AC-15 | Passwords are never stored or shown in plain text (U1, U6) | • After `npm run db:seed`, open the SQLite file (e.g. `sqlite3 dev.db "SELECT email, password FROM Users"`) or Prisma Studio<br>• Every password column holds a bcrypt hash (`$2a$` or `$2b$`), never `password123`<br>• Check the terminal running `npm run dev`: no login attempts print a password |

## 5. Not included (for now)

- Password reset by email / "forgot password" link — no email infrastructure in this project (the Admin reset in U9 covers forgotten passwords).
- Users choosing their own new password (login form only accepts, never sets; Admin reset always sets `password123`).
- "Remember me" option — sessions are always 8 hours.
- Self-registration, account creation UI, 2FA, SSO.
- Lockout that survives a server restart (the counter is in-memory; restarting `npm run dev` clears it — acceptable for a laptop demo).
- Rate limiting on anything other than the login form.
- Session invalidation of *other* devices (no per-device session store; the cookie is simply signed and time-limited).
