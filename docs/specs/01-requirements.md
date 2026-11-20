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
7. Change my password: any signed-in user can replace their own password on the **Change password page** (`/change-password`, reached from the header user menu), proving they know the current one (U10, U11).

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
- **U5. Log out** *(High)*. As a logged-in user, I can log out from the user menu in the header of every page so that the next person on my laptop is not signed in as me.
- **U6. Same demo accounts for everyone** *(High)*. As a developer or tester, I can load the six demo users with `npm run db:seed` so that everyone tests with the same logins (doc §7.2).
- **U7. Sessions expire** *(Medium)*. As a user, my session lasts 8 hours and then asks me to log in again, so that a forgotten-open laptop does not stay open forever.
- **U8. Lockout after guessing** *(Medium)*. As Budiman, the system blocks login for one email for 15 minutes after 5 consecutive failures, so that password guessing is slow (FR-10, OWASP A07).
- **U9. Admin resets a forgotten password** *(Medium)*. As an Admin, I can reset any user's password back to `password123` with a confirmation step, so that a forgotten password does not stop work. This is the only change an Admin can make (explicit exception to doc §5.3.6).
- **U10. Change my own password** *(Medium)*. As a signed-in user, I can change my own password on the Change password page (opened from the header user menu) by typing my current password and my new one twice, so that wanting a new password does not need the Admin (design rule 12).
- **U11. User menu** *(Medium)*. As a signed-in user, the header shows my name; clicking it opens a dropdown with **Change password** and **Log out**, so the account actions sit in one obvious place instead of crowding the header.

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
| Done | AC-09 | Logout works everywhere and cannot be walked back into (U5, U11) | • On any page, the header user menu (your name + role badge) contains a Log out item<br>• Open it, click Log out → you land on `/login`<br>• Press the browser Back button → `/employee` (or any protected page) must not show data; it redirects to `/login` |
| Done | AC-10 | `/login` and `/` send logged-in users home (U2) | • Log in as `hr-1@budiman.com`<br>• Type `/login` and then `/` in the address bar<br>• Both should redirect to `/hr` |
| Done | AC-11 | `npm run db:seed` loads the six demo users and is safe to re-run (U6) | • Delete the SQLite file (path per `02-design.md`) and run `npm run db:seed`<br>• All six demo users exist and each logs in with `password123`<br>• Run `npm run db:seed` twice → still exactly six users, no duplicate error; a changed password (AC-12) is restored to `password123` |
| Done | AC-12 | 5 failed logins lock that email for 15 minutes (U8) | • On `/login`, fail 5 times in a row with `employee-1@budiman.com` / `wrongpass`<br>• The 6th try — even with the **correct** password — shows "Too many attempts, try again later"<br>• `hr-1@budiman.com` can still log in (lockout is per email)<br>• Restart `npm run dev` (or wait 15 min) → `employee-1` can log in again |
| Done | AC-13 | Sessions last 8 hours and carry secure flags (U7) | • Log in, open DevTools → Application → Cookies<br>• The session cookie is `HttpOnly`, `SameSite=Lax`, and its expiry is about 8 hours out<br>• Edit the expiry to a past time → visiting `/employee` redirects to `/login` |
| Done | AC-14 | Admin resets a password; nobody else can (U9) | • Log in as `employee-1@budiman.com` (works), then log out<br>• Log in as `admin@budiman.com`<br>• Choose `employee-1` → "Reset password" → confirm the prompt → a success message appears<br>• `employee-1` logs in again with `password123`<br>• Log in as `employee-1`: no reset control is visible, and the Admin reset URL/action refuses them (AC-08) |
| Done | AC-15 | Passwords are never stored or shown in plain text (U1, U6) | • After `npm run db:seed`, open the SQLite file (e.g. `sqlite3 dev.db "SELECT email, password FROM Users"`) or Prisma Studio<br>• Every password column holds a bcrypt hash (`$2a$` or `$2b$`), never `password123`<br>• Check the terminal running `npm run dev`: no login attempts print a password |
| Done | AC-16 | A signed-in user can change their own password (U10) | • Log in as `employee-1@budiman.com` with `password123`<br>• Open the header user menu → Change password (lands on `/change-password`), in the card: current `password123`, new `newpass1234`, confirm `newpass1234`<br>• Success message shows and the session stays signed in<br>• Log out, sign in as `employee-1` with `newpass1234` → lands on `/employee`<br>• Restore with `npm run db:seed` |
| Done | AC-17 | A wrong current password is refused and changes nothing (U10) | • Log in as `hr-1@budiman.com`<br>• Submit the card with current `wrongpass`, new `newpass1234` twice<br>• Error "Current password is incorrect" appears and `hr-1` can still sign in with `password123` afterwards |
| Done | AC-18 | New-password rules are enforced on the server (U10) | • On the card try: new password `short` → "Use at least 8 characters"; new ≠ confirm → "Passwords do not match"; new same as current → "New password must be different from the current one"<br>• Nothing is saved: the old password still signs in |
| Done | AC-19 | Only the session user's own password can change (U3, U10) | • The form holds no user id (inspect the HTML: inputs are currentPassword/newPassword/confirmPassword only)<br>• Hand-crafting the POST with an employee cookie can therefore change only that employee's password<br>• Logged out, every protected page including `/change-password` redirects to `/login` first |
| Done | AC-20 | Header user menu offers Change password and Log out (U11) | • Sign in as any role → the header shows a pill with your name, role badge and a chevron<br>• Click it → a glass dropdown opens with **Change password** and **Log out**<br>• Change password → opens `/change-password`<br>• Click outside the menu or press Escape → the menu closes<br>• Open it again → Log out → lands on `/login` |

## 5. Not included (for now)

- Password reset by email / "forgot password" link — no email infrastructure in this project (the Admin reset in U9 covers forgotten passwords).
- Password rules beyond U10's minimum (at least 8 characters): no expiry, no history, no complexity checks. Email-based recovery stays out — Admin reset (U9) still covers genuinely forgotten passwords.
- "Remember me" option — sessions are always 8 hours.
- Self-registration, account creation UI, 2FA, SSO.
- Lockout that survives a server restart (the counter is in-memory; restarting `npm run dev` clears it — acceptable for a laptop demo).
- Rate limiting on anything other than the login form.
- Session invalidation of *other* devices (no per-device session store; the cookie is simply signed and time-limited).

---

# Leave Request – Requirements

> **This file answers:** What should the app do, and why?
> **Who:** The AI drafted it from the interview (2026-11-20) and `docs/Agentic AI - HRMS Doc.pdf` §4–§6, §7.2. You review it.
>
> When the app's behaviour needs to change, update this file **first**.
>
> Scope: the full leave request flow (doc §5.1) — submit, supervisor signs or
> rejects, employee sends to HR, HR decides — plus each role's request lists and
> the Admin's view-only list (FR-02…FR-08). Everything the Login & Access part
> above already guarantees (login, sessions, role checks, OWASP rules — FR-01,
> FR-10) applies to every screen and action here too.

## 1. The problem (doc §2)

Budiman Company processes leave on paper: the employee fills a form, the
supervisor signs it, HR copies it into a spreadsheet. Forms get lost, employees
cannot see where their request is, and HR has no single list of requests waiting
for a decision. This module gives the company:

1. One digital request per leave, visible from submission to decision.
2. A supervisor queue that only holds the requests naming that supervisor.
3. A shared HR queue where either officer decides and the system records who did.
4. Each role sees only the requests it needs to act on; the Admin sees everything, view only (doc §3).

## 2. Who uses it (roles)

Demo accounts and passwords: doc §7.2 — everyone logs in with their email and `password123`. The employee and both supervisors are in Finance, so `employee-1@budiman.com` can choose either supervisor.

| Role | Home page | What they see | What they can do | Doc |
|------|-----------|---------------|------------------|-----|
| **Employee** | `/employee` | Their own requests (current and past), with status and remarks | Submit a leave request; send their own Signed request to HR | FR-02, FR-04, FR-06 |
| **Supervisor** | `/supervisor` | Requests **naming them** (current and past), with status and remarks | Sign or reject a request in their queue; a rejection needs a remark | FR-03, FR-06 |
| **HR** | `/hr` | Requests that reached the HR queue (Pending HR, Approved, Rejected by HR) | Approve or reject any request in the shared queue; a rejection needs a remark; the officer who decides is recorded | FR-05, FR-06 |
| **Admin** | `/admin` | Every leave record, newest submitted first | Nothing on leave data — view only | FR-08 |

Supervisors, HR and Admin never submit leave requests — only the Employee role
has the New request form (doc §5.3.2, strict reading: "Employees apply for
leave. Supervisors and HR only decide").

## 3. User stories

- **U12. Submit a leave request** *(High)*. As an employee, I fill one form — leave type (plus "what is it for" when the type is Other), start date, end date, and a supervisor picked from my own division — and submit it, so my request enters the system as **Pending supervisor** instead of paper (doc §5.2, FR-02). Required fields are checked on the server, not just in the form.
- **U13. Sensible guardrails on submission** *(Medium)*. As Budiman, the submit action refuses obvious mistakes: start date in the past, end before start, remarks/reasons over 500 characters, and a new request whose dates overlap **my own** request still in a non-final state (Pending supervisor / Signed / Pending HR). Overlapping a Rejected or Approved request is allowed, so I can re-apply after a rejection. A division with no supervisor gets a friendly message instead of an empty picker. (Beyond doc §6 → Medium per doc §1.2.)
- **U14. Supervisor signs or rejects** *(High)*. As a supervisor, I see only the requests that name me and I sign one (it becomes **Signed**) or reject it **with a remark** (it becomes **Rejected by supervisor**, final) — so nothing gets lost and my queue is mine (doc §5.2, §5.3.4, FR-03).
- **U15. Employee sends a signed request to HR** *(High)*. As an employee, once my request is Signed I press **Send to HR**, and it joins the shared HR queue as **Pending HR** — only I can send my own request, and only when it is Signed (doc §5.3.5, FR-04).
- **U16. HR decides** *(High)*. As an HR officer, I approve (request becomes **Approved**) or reject **with a remark** (becomes **Rejected by HR**, final) any request in the shared queue; the system records **which officer** decided, and if a colleague decided first my attempt is refused with a clear "already decided" message — the first decision is the record (doc §5.2, §5.3.5, FR-05).
- **U17. Each role sees its own work** *(High)*. As a user, I see the current and past requests relevant to me — employee: my own; supervisor: the ones naming me; HR: everything that reached the HR queue — each with status, dates and remarks, and nothing that belongs to another role's work (doc §3 goal 2, FR-06).
- **U18. Confirm first, success afterwards** *(High)*. As any user, every leave action (submit, sign, reject, send to HR, HR approve, HR reject) asks for confirmation before it happens and shows a success message after — same pattern as the Admin password reset (doc §5.3.7, FR-07).
- **U19. Admin sees every leave record** *(Medium)*. As an Admin, I see one plain list of every request — employee, division, leave type, dates, status, both remarks, deciding officer — newest submitted first, with no way to change anything (doc §5.3.6, FR-08).

## 4. Acceptance checklist

Hand-test with the six demo accounts (doc §7.2): `employee-1`, `supervisor-1`,
`supervisor-2` (all Finance), `hr-1`, `hr-2`, `admin` — password `password123`.
"Cookie POST" means: copy the server action's form action URL and post it with
`curl` while holding only that user's session cookie (as in AC-08).

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| To do | AC-21 | Submitting a complete request creates it as Pending supervisor (U12, U17, U18) | • Log in as `employee-1` → `/employee` shows a **New leave request** card<br>• Pick Annual leave, start tomorrow, end in 3 days, supervisor "Supervisor 1" → Submit → confirm → success message<br>• The request shows in the employee's list as "Pending supervisor"<br>• It appears in `supervisor-1@budiman.com`'s queue |
| To do | AC-22 | Empty fields and an inverted date range show per-field errors (U12) | • Submit the form with everything empty → "required" errors under type, start date, end date, supervisor<br>• Set end date before start date → "End date cannot be before the start date"<br>• Nothing is saved: the list is unchanged |
| To do | AC-23 | "Other" needs a reason; other types don't (U12) | • Type = Other, "What is the leave for?" empty → field error, nothing saved<br>• Fill the reason → it submits<br>• Type = Annual leave → the reason field is not shown and not required |
| To do | AC-24 | Supervisor picker lists only supervisors of my own division (U12) | • As `employee-1` (Finance) the picker shows exactly Supervisor 1 and Supervisor 2 — no HR users, no Admin<br>• Cookie POST the submit action with a foreign user id as the supervisor (e.g. `hr-1`'s id) → refused on the server, nothing saved (AC-08 style) |
| To do | AC-25 | Guardrails: future dates only, no overlap with my open requests, text ≤ 500 chars (U13) | • Start date yesterday → "Start date cannot be in the past"<br>• With a Pending supervisor request 1–5 Dec, submit another covering 3–4 Dec → refused with a "you already have a request covering those dates" message<br>• Rejected or Approved requests do not block the same dates: reject a 1–5 Dec request, then re-submit 1–5 Dec → accepted<br>• Cookie POST the submit action with a 501-character reason (`otherLeaveType`, type Other) → refused; the form caps the textarea at 500 characters<br>• In Prisma Studio set `employee-1`'s division to Marketing → the picker is empty with "No supervisor is available in your division — contact HR" → restore Finance |
| To do | AC-26 | A supervisor signs a request (U14, U18) | • Log in as `supervisor-1` → the employee's Pending supervisor request is in the queue → **Sign** → confirm → success message<br>• Status becomes "Signed" in the employee's list; `signedAt` is set (check in Prisma Studio)<br>• The employee's row now offers **Send to HR** |
| To do | AC-27 | Rejection needs a remark; the employee sees it (U14, U17) | • `supervisor-1` clicks Reject with the remark empty → refused ("A remark is required")<br>• Type a remark → Reject → confirm → success message<br>• The employee's list shows "Rejected by supervisor" and the remark |
| To do | AC-28 | A supervisor can only act on requests naming them (U14, U17) | • A request naming Supervisor 1 never appears for `supervisor-2`<br>• Cookie POST the sign/reject action for that request with `supervisor-2`'s cookie → refused on the server; status unchanged (re-check as `supervisor-1`) |
| To do | AC-29 | The employee sends a Signed request to HR (U15, U18) | • As `employee-1`, press **Send to HR** on the Signed request → confirm → success message<br>• Status becomes "Pending HR"<br>• The request appears in **both** `hr-1`'s and `hr-2`'s queues |
| To do | AC-30 | Only the owner, only when Signed (U15) | • A request that was never Signed shows no Send to HR button<br>• Cookie POST the send action for a Pending supervisor request → refused<br>• Cookie POST it with `supervisor-1`'s cookie → refused — fails both the EMPLOYEE role check and the ownership check |
| To do | AC-31 | HR approves; HR rejects only with a remark (U16, U18) | • `hr-1` opens the Pending HR request → **Approve** → confirm → success → status "Approved"<br>• `hr-2` opens another Pending HR request → Reject with empty remark → refused → type a remark → Reject → confirm → success → status "Rejected by HR", remark visible to the employee |
| To do | AC-32 | The deciding officer is recorded; first decision wins (U16) | • `hr-1` approves request X; success message shows<br>• `hr-2` still has request X open and clicks Approve → refused: "Already decided by HR 1" — nothing changes<br>• The Admin list shows `hr-1` as the deciding officer for X |
| To do | AC-33 | Each role sees only its own work (U17) | • `employee-1` sees all **own** requests (every status, with dates and remarks) and none of anyone else's<br>• `supervisor-1` sees every request **naming them** (current and past); a request naming Supervisor 2 is never shown<br>• `hr-1` sees only requests that reached the HR queue (Pending HR / Approved / Rejected by HR) — a request rejected by a supervisor never appears |
| To do | AC-34 | Admin sees every record and changes nothing (U19) | • Log in as `admin` → `/admin` keeps the users card and adds an **All leave requests** card: every request with employee, division, type, dates, status, both remarks and the deciding officer, newest submitted first<br>• No buttons or inputs on that card<br>• Cookie POST any leave action (sign, reject, send, approve) with the Admin cookie → refused on the server; statuses unchanged |
| To do | AC-35 | Confirm first, success after — every action (U18) | • For each of the six actions (submit, sign, reject, send to HR, HR approve, HR reject): dismiss the confirmation → nothing changes; accept it → the change happens and a success message shows |

## 5. Not included (for now)

- **No withdraw, no edit.** A submitted request is final except for the two decisions and Send to HR. All rejections are Final (doc §5.2); fixing a wrong request means submitting a fresh one (overlaps vs Rejected/Approved are allowed, AC-25).
- **Supervisors, HR and Admin cannot book their own leave** — only the Employee role submits (doc §5.3.2 strict reading; interview answer 1).
- **No day counting.** Lists show "Start → End" only; no working-days field or calculation (interview answer 7).
- **No leave balances, quotas or entitlements** — nothing in doc §7.2 asks for them.
- **No notifications or email** — no email infrastructure exists (same reason as "no forgot password" above).
- **No attachments** (no "supporting document" upload).
- **No filters, search or pagination** on any list, including the Admin's (interview answer 8).
- **No supervisor delegation** — if the named supervisor is away, the request waits (queue is personal, interview answer 5).
- **The seed stays users-only** — test requests are created through the UI, never by `npm run db:seed` (interview answer 9; AC-11 unchanged).
