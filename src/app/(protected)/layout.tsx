// Task 4 of docs/specs/03-tasks.md — the shared guard for the four role
// homes. A visitor with no (or a broken) session never sees any of these
// pages; they go to /login. Task 6 added the Log out button.

import { requireUser } from '@/lib/session'
import { logout } from '@/app/actions/auth'

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employee',
  SUPERVISOR: 'Supervisor',
  HR: 'HR',
  ADMIN: 'Admin',
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  // Liquid Glass look (design §4.1): the gradient fills the viewport and the
  // header is a frosted bar; everything inside keeps its behaviour.
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-cyan-900 to-blue-950">
      <header className="border-b border-white/15 bg-white/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="font-semibold tracking-wide text-white">Budiman HRMS</span>
          <span className="flex items-center gap-3 text-sm text-white">
            <span>{user.name}</span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs uppercase">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full bg-white/15 px-3 py-1 text-xs text-white hover:bg-white/25"
              >
                Log out
              </button>
            </form>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  )
}
