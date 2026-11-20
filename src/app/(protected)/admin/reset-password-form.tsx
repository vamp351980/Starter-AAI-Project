'use client'

// Task 8: one "Reset password" button per user row. The confirmation dialog
// and the success message (design §4: confirm -> action -> success) need
// client interactivity; the real permission check is inside the server
// action (requireUser('ADMIN')), not here.

import { useActionState } from 'react'
import { adminResetPassword, type ResetState } from '@/app/actions/auth'
import { DEMO_PASSWORD } from '@/lib/reference-data'

export function ResetPasswordForm({ userId, userName }: { userId: number; userName: string }) {
  const [state, formAction, pending] = useActionState<ResetState | undefined, FormData>(
    adminResetPassword,
    undefined,
  )

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Reset ${userName}'s password to "${DEMO_PASSWORD}"?`)) {
          event.preventDefault()
        }
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        Reset password
      </button>
      {state?.message ? (
        <span role="alert" className="text-xs font-semibold text-emerald-200">
          {state.message}
        </span>
      ) : null}
    </form>
  )
}
