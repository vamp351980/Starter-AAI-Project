// Task 9 of docs/specs/03-tasks.md, design rule 7: proxy.ts is an
// optimistic shortcut that redirects before any protected content renders,
// and NEVER the only guard. requireUser() in the layout, pages and server
// actions (Tasks 4–8) stays the real check; the Prisma-backed verification
// deliberately does not happen here (Proxy is not for data fetching).
// Next 16 runs Proxy on the Node.js runtime, so verifySessionToken's
// node:crypto use is supported.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { homeForRole, LOGIN_ROUTE, SESSION_COOKIE, verifySessionToken } from '@/lib/session'

// Task 12 added /change-password: any signed-in role may open it, but a
// logged-out visitor must never see it (page guard does the real check).
const PROTECTED_PREFIXES = ['/employee', '/supervisor', '/hr', '/admin', '/change-password']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let ticket = null
  try {
    ticket = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value ?? '')
  } catch {
    // Fail closed: with no usable SESSION_SECRET there is no valid session,
    // so treat the visitor as logged out (real refusal still happens in
    // requireUser, which surfaces the configuration error).
    ticket = null
  }

  if (!ticket && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
  }
  if (ticket && (pathname === LOGIN_ROUTE || pathname === '/')) {
    return NextResponse.redirect(new URL(homeForRole(ticket.role), request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Task 9's six route groups + /change-password (Task 12).
  matcher: [
    '/employee/:path*',
    '/supervisor/:path*',
    '/hr/:path*',
    '/admin/:path*',
    '/change-password',
    '/login',
    '/',
  ],
}
