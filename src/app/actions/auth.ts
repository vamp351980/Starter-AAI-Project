'use server'

// Server actions for the login module (docs/specs/03-tasks.md Tasks 5–8):
// login, logout, and the Admin password reset. Validation and credential
// checks run on the server only (design §6); the password is never logged.

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isBlocked, LOCKOUT_MESSAGE, recordFailure, resetFailures } from '@/lib/lockout'
import { DEMO_PASSWORD } from '@/lib/reference-data'
import { destroySessionCookie, homeForRole, LOGIN_ROUTE, requireUser, setSessionCookie } from '@/lib/session'

export type LoginState = {
  errors?: { email?: string; password?: string }
  message?: string
}

// Unknown email and wrong password must answer identically, including in
// timing (design rule 3): this real bcrypt hash of a nobody-knows value
// keeps the compare running for emails with no account.
const ALWAYS_COMPARE = '$2b$10$QSwYe5jafY3uGy8/lcXic.eh7y6j8FOvR11H4FW1e/2PqJPtQJNGe'

const GENERIC_FAILURE = 'Invalid email or password'

export async function login(
  _previous: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  const errors: NonNullable<LoginState['errors']> = {}
  if (!email) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  } else if (!email.endsWith('@budiman.com')) {
    errors.email = 'Use your @budiman.com work email.'
  }
  if (!password) {
    errors.password = 'Password is required.'
  }
  if (errors.email || errors.password) {
    return { errors }
  }

  // Task 7 / AC-12: blocked emails are refused before any credential check,
  // even with the correct password.
  if (isBlocked(email)) {
    return { message: LOCKOUT_MESSAGE }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  const matches = await bcrypt.compare(password, user?.password ?? ALWAYS_COMPARE)
  if (!user || !matches) {
    recordFailure(email)
    return { message: GENERIC_FAILURE }
  }
  resetFailures(email)

  await setSessionCookie(user)
  redirect(homeForRole(user.role))
}

/** Task 6: ends the session from the header button and returns to /login. */
export async function logout(): Promise<void> {
  await destroySessionCookie()
  redirect(LOGIN_ROUTE)
}

export type ResetState = { message?: string }

/**
 * Task 8 / AC-08 & AC-14 (design rule 9, the one scoped exception to
 * "Admin is view only"): resets the chosen user to the demo password.
 * requireUser('ADMIN') runs first so a hand-crafted request with any
 * non-Admin cookie is refused on the server, regardless of what the
 * /admin page showed. The plain password is never logged.
 */
export async function adminResetPassword(
  _previous: ResetState | undefined,
  formData: FormData,
): Promise<ResetState> {
  await requireUser('ADMIN')

  const id = Number(formData.get('userId'))
  if (!Number.isInteger(id) || id <= 0) {
    return { message: 'No user selected.' }
  }
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) {
    return { message: 'User not found.' }
  }
  await prisma.user.update({
    where: { id },
    data: { password: await bcrypt.hash(DEMO_PASSWORD, 10) },
  })
  return { message: `Password reset for ${target.name}. They can sign in with ${DEMO_PASSWORD}.` }
}
