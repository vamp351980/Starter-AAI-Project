'use client'

// Task 11 (U10, AC-16…AC-19), relocated to the /change-password page by
// Task 12. All checks live in the changePassword server action; this
// component only shows what it returns. Look: design §4.1 (pill inputs,
// rose errors, emerald success). The form holds no user id — the session
// decides whose password changes (AC-19).

import { useActionState } from 'react'
import { changePassword, type ChangePasswordState } from '@/app/actions/auth'

const FIELD_CLASS =
  'w-full rounded-full border border-white/20 bg-white/15 px-5 py-2.5 text-white placeholder-white/60 focus:border-white/60 focus:outline-none'

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ChangePasswordState | undefined, FormData>(
    changePassword,
    undefined,
  )

  return (
    <form action={formAction} className="mx-auto mt-6 max-w-md space-y-4">
      <div>
        <label htmlFor="currentPassword" className="sr-only">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          placeholder="Current password"
          autoComplete="current-password"
          className={FIELD_CLASS}
        />
        {state?.errors?.currentPassword && (
          <p className="mt-1 px-5 text-xs text-rose-200">{state.errors.currentPassword}</p>
        )}
      </div>

      <div>
        <label htmlFor="newPassword" className="sr-only">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="New password (at least 8 characters)"
          autoComplete="new-password"
          className={FIELD_CLASS}
        />
        {state?.errors?.newPassword && (
          <p className="mt-1 px-5 text-xs text-rose-200">{state.errors.newPassword}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="sr-only">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          className={FIELD_CLASS}
        />
        {state?.errors?.confirmPassword && (
          <p className="mt-1 px-5 text-xs text-rose-200">{state.errors.confirmPassword}</p>
        )}
      </div>

      {state?.message && (
        <p role="alert" className="text-center text-sm font-semibold text-rose-200">
          {state.message}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-center text-sm font-semibold text-emerald-200">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? 'Changing…' : 'Change password'}
      </button>
    </form>
  )
}
