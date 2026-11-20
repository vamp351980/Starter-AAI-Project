// Task 12 of docs/specs/03-tasks.md (U10, U11): the Change password page,
// reached from the header user menu. requireUser() with no role argument —
// any signed-in role may change their own password; logged-out visitors
// are redirected to /login by the layout guard (and optimistically by
// proxy.ts). The form itself and every check live in form.tsx + the
// changePassword server action.

import { requireUser } from '@/lib/session'
import ChangePasswordForm from './form'

export default async function ChangePasswordPage() {
  await requireUser()

  return (
    <section className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
      <h1 className="text-center text-2xl font-bold text-white">Change my password</h1>
      <ChangePasswordForm />
    </section>
  )
}
