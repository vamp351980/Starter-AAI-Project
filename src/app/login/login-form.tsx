'use client'

// Task 5 of docs/specs/03-tasks.md. All checks live in the login server
// action; this component only shows what it returns (per-field errors and
// the one generic failure message — AC-02…AC-05).

import { useActionState } from 'react'
import { login, type LoginState } from '@/app/actions/auth'

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState | undefined, FormData>(
    login,
    undefined,
  )

  // Liquid Glass look (design §4.1): pill inputs with the visible text in the
  // placeholder like the reference; the <label> stays as the accessible name.
  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="sr-only">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="text"
          placeholder="Work email"
          autoComplete="username"
          className="w-full rounded-full border border-white/20 bg-white/15 px-5 py-2.5 text-white placeholder-white/60 focus:border-white/60 focus:outline-none"
        />
        {state?.errors?.email && (
          <p className="mt-1 px-5 text-xs text-rose-200">{state.errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          className="w-full rounded-full border border-white/20 bg-white/15 px-5 py-2.5 text-white placeholder-white/60 focus:border-white/60 focus:outline-none"
        />
        {state?.errors?.password && (
          <p className="mt-1 px-5 text-xs text-rose-200">{state.errors.password}</p>
        )}
      </div>

      {state?.message && (
        <p role="alert" className="text-center text-sm font-semibold text-rose-200">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
