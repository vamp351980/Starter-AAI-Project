// Task 15, design §4 badges: one glass pill per status, colours per the
// design map — amber for the two Pending states, sky for Signed, emerald
// for Approved, rose for both Rejected states. Shared by every leave list.

import type { LeaveStatus } from '@prisma/client'
import { STATUS_LABELS } from '@/lib/leave'

const BADGE_CLASS: Record<LeaveStatus, string> = {
  PENDING_SUPERVISOR: 'bg-amber-400/20 text-amber-100',
  PENDING_HR: 'bg-amber-400/20 text-amber-100',
  SIGNED: 'bg-sky-400/20 text-sky-100',
  APPROVED: 'bg-emerald-400/20 text-emerald-100',
  REJECTED_SUPERVISOR: 'bg-rose-400/25 text-rose-100',
  REJECTED_HR: 'bg-rose-400/25 text-rose-100',
}

export function StatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ${BADGE_CLASS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
