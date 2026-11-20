'use server'

// Server actions for the login module (docs/specs/03-tasks.md Tasks 5–8
// and 11): login, logout, the Admin password reset, and change-my-password.
// Validation and credential checks run on the server only (design §6); the
// password is never logged.

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

export type ChangePasswordState = {
  errors?: { currentPassword?: string; newPassword?: string; confirmPassword?: string }
  message?: string
  success?: string
}

const MIN_NEW_PASSWORD_LENGTH = 8

/**
 * Task 11 / AC-16…AC-19 (design rule 12): a signed-in user replaces their
 * own password. requireUser() runs first (any role — the session is the
 * credential), and the form carries no user id, so only the session user's
 * own hash is ever compared or written (AC-19). The session stays valid:
 * the ticket names the user, not the password (rule 4). Plain passwords
 * are never logged.
 */
export async function changePassword(
  _previous: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser()

  const currentPassword = String(formData.get('currentPassword') ?? '')
  const newPassword = String(formData.get('newPassword') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  const errors: NonNullable<ChangePasswordState['errors']> = {}
  if (!currentPassword) {
    errors.currentPassword = 'Current password is required.'
  }
  if (!newPassword) {
    errors.newPassword = 'New password is required.'
  } else if (newPassword.length < MIN_NEW_PASSWORD_LENGTH) {
    errors.newPassword = `Use at least ${MIN_NEW_PASSWORD_LENGTH} characters.`
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your new password.'
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }
  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return { message: 'Current password is incorrect.' }
  }
  if (newPassword === currentPassword) {
    return { message: 'New password must be different from the current one.' }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 10) },
  })
  return { success: 'Password updated. Use it next time you sign in.' }
}
