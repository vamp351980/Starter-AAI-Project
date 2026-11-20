// Task 6 of docs/specs/03-tasks.md: `/` is never a page of its own —
// logged in goes to your own home, logged out goes to /login (AC-10).

import { redirect } from 'next/navigation'
import { getSessionUser, homeForRole, LOGIN_ROUTE } from '@/lib/session'

export default async function Home() {
  const user = await getSessionUser()
  redirect(user ? homeForRole(user.role) : LOGIN_ROUTE)
}
