// Design rules 4–5 and 11 of docs/specs/02-design.md: the session is a
// base64url JSON ticket signed with HMAC-SHA256, not a database lookup.
// requireUser() always re-reads the user from the database, so a changed
// role or deleted user loses access even with an unexpired ticket.
// The password never appears in the ticket, and nothing here logs it.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Role, User } from '@prisma/client'
import { prisma } from './db'

export const SESSION_COOKIE = 'hrms_session'
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60 // 8 working hours
export const LOGIN_ROUTE = '/login'

export type SessionTicket = {
  userId: number
  role: Role
  /** Unix epoch ms after which the ticket must be refused. */
  exp: number
}

const HOMES: Record<Role, string> = {
  EMPLOYEE: '/employee',
  SUPERVISOR: '/supervisor',
  HR: '/hr',
  ADMIN: '/admin',
}

export function homeForRole(role: Role): string {
  return HOMES[role]
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    // Fail closed: never sign with a default key (design rule 11).
    throw new Error('SESSION_SECRET is not set — copy .env.example to .env.local')
  }
  return secret
}

function sign(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payload).digest()
}

export function createSessionToken(
  user: { id: number; role: Role },
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): string {
  const secret = sessionSecret()
  const ticket: SessionTicket = {
    userId: user.id,
    role: user.role,
    exp: Date.now() + maxAgeSeconds * 1000,
  }
  const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url')
  return `${payload}.${sign(payload, secret).toString('base64url')}`
}

export function verifySessionToken(token: string): SessionTicket | null {
  const secret = sessionSecret()
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = sign(payload, secret)
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const ticket = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionTicket
    if (typeof ticket.userId !== 'number' || typeof ticket.exp !== 'number') return null
    if (ticket.exp < Date.now()) return null
    return ticket
  } catch {
    return null
  }
}

/** Write the signed session cookie. Server Actions only (design rule 4). */
export async function setSessionCookie(user: User): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production', // https in production, plain http on localhost
  })
}

export async function destroySessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/**
 * The user behind a valid, unexpired ticket, re-read from the database
 * (design rule 5). `explicitToken` lets scripts check a ticket without a
 * request; pages and actions call it with no argument.
 */
export async function getSessionUser(explicitToken?: string): Promise<User | null> {
  let token = explicitToken
  if (token === undefined) {
    const cookieStore = await cookies()
    token = cookieStore.get(SESSION_COOKIE)?.value
  }
  if (!token) return null
  const ticket = verifySessionToken(token)
  if (!ticket) return null
  const user = await prisma.user.findUnique({ where: { id: ticket.userId } })
  return user
}

/**
 * The guard for layouts, pages and server actions. No session → /login;
 * right session, wrong role → the user's own home (rule 6). Never 404.
 * `explicitToken` lets the Task 3 script check a ticket without a request.
 */
export async function requireUser(role?: Role, explicitToken?: string): Promise<User> {
  const user = await getSessionUser(explicitToken)
  if (!user) redirect(LOGIN_ROUTE)
  if (role && user.role !== role) redirect(homeForRole(user.role))
  return user
}
