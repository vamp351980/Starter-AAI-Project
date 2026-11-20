'use client'

// Task 19 (U16, AC-31/32, LR-11): the shared Awaiting-HR rows. Each row posts
// requestId + decision (approve / reject) to hrDecide after a confirm; the
// first decision wins (LR-7) and the reject remark is enforced server-side
// (LR-4). The remark input lives inside the Reject form only, so its
// `required` never blocks an Approve. The empty state keeps the message block
// rendered, so deciding the last queued row still shows its LR-11 success
// message (found by the Task 22 browser sweep).

import { useActionState } from 'react'
import { LEAVE_TYPE_LABELS, type HrQueueRow } from '@/lib/leave'
import { hrDecide, type HrDecisionState } from '@/app/actions/leave'

const BUTTON_CLASS =
  'rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500'
const INPUT_CLASS =
  'rounded-full bg-white/15 px-4 py-1.5 text-sm text-white placeholder:text-white/50'

function dayOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function Queue({ rows }: { rows: HrQueueRow[] }) {
  const [state, formAction] = useActionState<HrDecisionState | null, FormData>(hrDecide, null)
  return (
    <div>
      {state?.success ? (
        <p className="mt-4 text-center text-sm text-emerald-200">{state.success}</p>
      ) : null}
      {state?.message ? (
        <p className="mt-4 text-center text-sm text-rose-200">{state.message}</p>
      ) : null}
      {state?.errors?.hrRemark ? (
        <p className="mt-4 text-center text-sm text-rose-200">{state.errors.hrRemark}</p>
      ) : null}
      {rows.length === 0 ? (
        <p className="mt-4 text-center text-sm text-white/60">Nothing waiting for HR.</p>
      ) : (
      <table className="mt-4 w-full text-left text-sm text-white">
        <thead>
          <tr className="border-b border-white/15 text-xs uppercase tracking-wide text-white/60">
            <th className="py-2 pr-4">Employee</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Dates</th>
            <th className="py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/15 last:border-0">
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
              <td className="py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <form
                    action={formAction}
                    onSubmit={(event) => {
                      if (!window.confirm('Approve this leave request?')) event.preventDefault()
                    }}
                  >
                    <input type="hidden" name="requestId" value={row.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button type="submit" className={BUTTON_CLASS}>
                      Approve
                    </button>
                  </form>
                  <form
                    action={formAction}
                    onSubmit={(event) => {
                      if (!window.confirm('Reject this leave request?')) event.preventDefault()
                    }}
                  >
                    <input type="hidden" name="requestId" value={row.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <input
                      type="text"
                      name="remark"
                      maxLength={500}
                      placeholder="Remark (required)"
                      required
                      className={`${INPUT_CLASS} mr-2 w-44`}
                    />
                    <button type="submit" className={`${BUTTON_CLASS} bg-rose-600 hover:bg-rose-500`}>
                      Reject
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  )
}
