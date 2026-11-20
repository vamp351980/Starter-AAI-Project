import { requireUser } from '@/lib/session'

export default async function EmployeeHomePage() {
  const user = await requireUser('EMPLOYEE')
  return (
    <section className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
      <h1 className="text-center text-2xl font-bold text-white">Welcome, {user.name}</h1>
      <p className="mt-1 text-center text-sm text-white/70">
        {user.designation} — {user.division}
      </p>
      <p className="mt-4 text-center text-white/60">Leave features arrive in the next module.</p>
    </section>
  )
}
