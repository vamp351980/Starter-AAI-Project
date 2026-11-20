import { redirect } from 'next/navigation'
import { getSessionUser, homeForRole } from '@/lib/session'
import LoginForm from './login-form'

export default async function LoginPage() {
  // Task 6 / AC-10: a logged-in visitor never sees the form; to their home.
  const user = await getSessionUser()
  if (user) redirect(homeForRole(user.role))

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-700 via-cyan-900 to-blue-950 px-4">
      <section className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h1 className="text-center text-3xl font-bold text-white">Sign in</h1>
        <LoginForm />
      </section>
    </main>
  )
}
