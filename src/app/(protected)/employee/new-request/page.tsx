// Task 23 (AC-36, design §4 2026-11-20): the New leave request form on its
// own page, opened by the New Request pill in the My requests card. The
// supervisor picker is still exactly the SUPERVISOR users of the employee's
// own division (doc §5.3.3, LR-2); the submit action re-checks it server-side.

import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { Role } from '@prisma/client'
import { LeaveForm } from '../leave-form'

export default async function NewRequestPage() {
  const user = await requireUser('EMPLOYEE')
  const supervisors = await prisma.user.findMany({
    where: { role: Role.SUPERVISOR, division: user.division },
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="space-y-6">
      <section className="mx-auto max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex">
          <Link
            href="/employee"
            className="rounded-full bg-white/15 px-4 py-1.5 text-sm text-white transition hover:bg-white/25"
          >
            Back to my requests
          </Link>
        </div>
        <h2 className="mt-4 text-center text-lg font-semibold text-white">New leave request</h2>
        <div className="mt-6">
          <LeaveForm supervisors={supervisors} />
        </div>
      </section>
    </div>
  )
}
