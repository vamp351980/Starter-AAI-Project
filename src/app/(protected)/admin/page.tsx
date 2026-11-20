import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { ResetPasswordForm } from './reset-password-form'

export default async function AdminHomePage() {
  const user = await requireUser('ADMIN')
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } })

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h1 className="text-center text-2xl font-bold text-white">Welcome, {user.name}</h1>
        <p className="mt-1 text-center text-sm text-white/70">
          {user.designation} — {user.division}
        </p>
        <p className="mt-4 text-center text-white/60">
          View only, except the one scoped exception: resetting a forgotten password to the demo
          password.
        </p>
      </section>

      <section className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h2 className="text-center text-lg font-semibold text-white">Users</h2>
        <table className="mt-4 w-full text-left text-sm text-white">
          <thead>
            <tr className="border-b border-white/15 text-xs uppercase tracking-wide text-white/60">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Division</th>
              <th className="py-2">Password</th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => (
              <tr key={row.id} className="border-b border-white/15 last:border-0">
                <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                <td className="py-2.5 pr-4 text-white/80">{row.email}</td>
                <td className="py-2.5 pr-4 text-white/80">{row.role}</td>
                <td className="py-2.5 pr-4 text-white/80">{row.division}</td>
                <td className="py-2.5">
                  <ResetPasswordForm userId={row.id} userName={row.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
