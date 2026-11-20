// Task 7 of docs/specs/03-tasks.md — design rule 8: five consecutive
// failures for one email block that email's logins for 15 minutes. The map
// is in-memory on purpose (laptop demo): restarting npm run dev clears it.
// Correct passwords are refused while blocked, so guessing gains no signal.

const MAX_FAILURES = 5
const BLOCK_MS = 15 * 60 * 1000

export const LOCKOUT_MESSAGE = 'Too many attempts, try again later'

type Attempt = { failures: number; blockedUntil?: number }

const attempts = new Map<string, Attempt>()

export function isBlocked(email: string): boolean {
  const entry = attempts.get(email)
  if (!entry?.blockedUntil) return false
  if (entry.blockedUntil <= Date.now()) {
    attempts.delete(email)
    return false
  }
  return true
}

export function recordFailure(email: string): void {
  const entry = attempts.get(email) ?? { failures: 0 }
  entry.failures += 1
  if (entry.failures >= MAX_FAILURES) entry.blockedUntil = Date.now() + BLOCK_MS
  attempts.set(email, entry)
}

export function resetFailures(email: string): void {
  attempts.delete(email)
}
