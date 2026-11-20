// Task 4 shell; Task 19 adds the two cards (design §4). Both HR queries are
// role-wide, not per-officer (LR-10): hr-1 and hr-2 read the same queue, and
// the decisions card names whoever decided (FR-05).

import { hrDecidedRequests, LEAVE_TYPE_LABELS, pendingForHr } from '@/lib/leave'
import { requireUser } from '@/lib/session'
import { StatusBadge } from '../status-badge'
import { Queue } from './queue'

function dayOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export default async function HrHomePage() {
  const user = await requireUser('HR')
  const queue = await pendingForHr()
  const decisions = await hrDecidedRequests()

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h1 className="text-center text-2xl font-bold text-white">Welcome, {user.name}</h1>
        <p className="mt-1 text-center text-sm text-white/70">
          {user.designation} — {user.division}
        </p>
      </section>

      <section className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h2 className="text-center text-lg font-semibold text-white">Awaiting HR</h2>
        <Queue rows={queue} />
      </section>

      <section className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h2 className="text-center text-lg font-semibold text-white">HR decisions</h2>
        {decisions.length === 0 ? (
          <p className="text-center text-sm text-white/60">No HR decisions yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm text-white">
            <thead>
              <tr className="border-b border-white/15 text-xs uppercase tracking-wide text-white/60">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Dates</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Decided by</th>
                <th className="py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((row) => (
                <tr key={row.id} className="border-b border-white/15 last:border-0 align-top">
                  <td className="py-2.5 pr-4 font-medium">{row.employee.name}</td>
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
                  <td className="py-2.5 pr-4 text-white/80">{row.hrOfficer?.name ?? ''}</td>
                  <td className="py-2.5 text-white/80">{row.hrRemark ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
