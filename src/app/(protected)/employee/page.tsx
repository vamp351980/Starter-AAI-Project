// Task 4 shell; Task 15 added the My requests card (design §4). Task 23
// (AC-36, 2026-11-20) moved the New leave request form to its own page
// /employee/new-request — this card now carries the New Request pill that
// opens it; the form (and its division supervisor query) lives there.

import Link from 'next/link'
import { leaveRequestsForEmployee } from '@/lib/leave'
import { requireUser } from '@/lib/session'
import { RequestList } from './request-list'

export default async function EmployeeHomePage() {
  const user = await requireUser('EMPLOYEE')
  const requests = await leaveRequestsForEmployee(user.id)

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h1 className="text-center text-2xl font-bold text-white">Welcome, {user.name}</h1>
        <p className="mt-1 text-center text-sm text-white/70">
          {user.designation} — {user.division}
        </p>
      </section>

      {/* Task 15 (FR-06): the rows come only from the employeeId-filtered
          query — the query is the control (LR-10). */}
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">My requests</h2>
          <Link
            href="/employee/new-request"
            className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            New Request
          </Link>
        </div>
        <RequestList requests={requests} />
      </section>
    </div>
  )
}
