// Task 4 of docs/specs/03-tasks.md — the shared guard for the four role
// homes and /change-password. A visitor with no (or a broken) session
// never sees any of these pages; they go to /login. Task 12 moved the
// account actions (Log out, Change password) into the header user menu.

import { requireUser } from '@/lib/session'
import UserMenu from './user-menu'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  // Liquid Glass look (design §4.1): the gradient fills the viewport and the
  // header is a frosted bar; everything inside keeps its behaviour.
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-cyan-900 to-blue-950">
      {/* relative z-50 keeps the open user menu above the frosted glass cards (design §4.1) */}
      <header className="relative z-50 border-b border-white/15 bg-white/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="font-semibold tracking-wide text-white">Budiman HRMS</span>
          <UserMenu name={user.name} role={user.role} />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  )
}
