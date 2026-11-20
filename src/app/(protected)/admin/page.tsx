import { prisma } from '@/lib/db'
import { allLeaveRequests, LEAVE_TYPE_LABELS } from '@/lib/leave'
import { requireUser } from '@/lib/session'
import { StatusBadge } from '../status-badge'
import { ResetPasswordForm } from './reset-password-form'

function dayOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export default async function AdminHomePage() {
  const user = await requireUser('ADMIN')
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } })
  const requests = await allLeaveRequests()

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

      {/* Task 21 (U19, AC-34, FR-08): the Admin's view-only All-leave card —
          server-rendered from allLeaveRequests(), zero controls (LR-12). */}
      <section className="mx-auto max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h2 className="text-center text-lg font-semibold text-white">All leave requests</h2>
        {requests.length === 0 ? (
          <p className="text-center text-sm text-white/60">No leave requests yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm text-white">
            <thead>
              <tr className="border-b border-white/15 text-xs uppercase tracking-wide text-white/60">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Division</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Dates</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Supervisor remark</th>
                <th className="py-2 pr-4">HR remark</th>
                <th className="py-2">Decided by</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((row) => (
                <tr key={row.id} className="border-b border-white/15 last:border-0 align-top">
                  <td className="py-2.5 pr-4 font-medium">{row.employee.name}</td>
                  <td className="py-2.5 pr-4 text-white/80">{row.employee.division}</td>
                  <td className="py-2.5 pr-4">
                    {LEAVE_TYPE_LABELS[row.leaveType]}
                    {row.leaveType === 'OTHER' && row.otherLeaveType ? (
                      <span className="block text-xs font-normal text-white/70">{row.otherLeaveType}</span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-4 text-white/80">
                    {dayOnly(row.startDate)} → {dayOnly(row.endDate)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-2.5 pr-4 text-white/80">{row.supervisorRemark ?? ''}</td>
                  <td className="py-2.5 pr-4 text-white/80">{row.hrRemark ?? ''}</td>
                  <td className="py-2.5 text-white/80">{row.hrOfficer?.name ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
