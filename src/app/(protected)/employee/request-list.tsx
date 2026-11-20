'use client'

// Task 15+18 (U15, U17, AC-29/30/33 employee part, FR-06): the My requests
// card. The rows come from leaveRequestsForEmployee — the employeeId query is
// the control (LR-10), this component only renders what it receives. Remarks
// are rendered as React text (design §6). Task 18 adds the Send to HR pill on
// SIGNED rows only — the server action still re-checks role, owner and status
// (LR-3), so the pill is a convenience, never the control.

import { useActionState } from 'react'
import type { LeaveRequest } from '@prisma/client'
import { LEAVE_TYPE_LABELS } from '@/lib/leave'
import { sendToHr, type SendToHrState } from '@/app/actions/leave'
import { StatusBadge } from '../status-badge'

const BUTTON_CLASS =
  'rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500'

function dayOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function RequestList({ requests }: { requests: LeaveRequest[] }) {
  const [state, formAction] = useActionState<SendToHrState | null, FormData>(sendToHr, null)
  if (requests.length === 0) {
    return <p className="text-center text-sm text-white/60">No leave requests yet.</p>
  }
  return (
    <div>
      {state?.success ? (
        <p className="mt-4 text-center text-sm text-emerald-200">{state.success}</p>
      ) : null}
      {state?.message ? (
        <p className="mt-4 text-center text-sm text-rose-200">{state.message}</p>
      ) : null}
      <table className="mt-4 w-full text-left text-sm text-white">
        <thead>
          <tr className="border-b border-white/15 text-xs uppercase tracking-wide text-white/60">
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Dates</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Remarks</th>
            <th className="py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b border-white/15 last:border-0 align-top">
              <td className="py-2.5 pr-4 font-medium">
                {LEAVE_TYPE_LABELS[request.leaveType]}
                {request.leaveType === 'OTHER' && request.otherLeaveType ? (
                  <span className="block text-xs font-normal text-white/70">{request.otherLeaveType}</span>
                ) : null}
              </td>
              <td className="py-2.5 pr-4 text-white/80">
                {dayOnly(request.startDate)} → {dayOnly(request.endDate)}
              </td>
              <td className="py-2.5 pr-4">
                <StatusBadge status={request.status} />
              </td>
              <td className="py-2.5 pr-4 text-white/80">
                {request.supervisorRemark ?? request.hrRemark ?? ''}
              </td>
              <td className="py-2.5 text-right">
                {/* AC-30: the pill exists only on own SIGNED rows; the action
                    re-checks owner + status for a hand-crafted POST. */}
                {request.status === 'SIGNED' ? (
                  <form
                    action={formAction}
                    onSubmit={(event) => {
                      if (!window.confirm('Send this request to HR?')) event.preventDefault()
                    }}
                  >
                    <input type="hidden" name="requestId" value={request.id} />
                    <button type="submit" className={BUTTON_CLASS}>
                      Send to HR
                    </button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
