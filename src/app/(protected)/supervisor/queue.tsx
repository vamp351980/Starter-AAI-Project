'use client'

// Task 16+17 (U14, AC-26/27, LR-11): the Awaiting-your-signature rows. Each
// row posts its requestId + decision (sign / reject) to supervisorDecide
// after a confirm — the server re-checks everything (LR-3), including the
// remark rule LR-4. The remark input lives inside the Reject form only, so
// its `required` never blocks a Sign. The empty state keeps the message block
// rendered, so deciding the last queued row still shows its LR-11 success
// message (found by the Task 22 browser sweep).

import { useActionState } from 'react'
import { LEAVE_TYPE_LABELS, type SupervisorRow } from '@/lib/leave'
import { supervisorDecide, type SupervisorDecisionState } from '@/app/actions/leave'

const BUTTON_CLASS =
  'rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500'
const INPUT_CLASS =
  'rounded-full bg-white/15 px-4 py-1.5 text-sm text-white placeholder:text-white/50'

function dayOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function Queue({ rows }: { rows: SupervisorRow[] }) {
  const [state, formAction] = useActionState<SupervisorDecisionState | null, FormData>(
    supervisorDecide,
    null,
  )
  return (
    <div>
      {state?.success ? (
        <p className="mt-4 text-center text-sm text-emerald-200">{state.success}</p>
      ) : null}
      {state?.message ? (
        <p className="mt-4 text-center text-sm text-rose-200">{state.message}</p>
      ) : null}
      {state?.errors?.supervisorRemark ? (
        <p className="mt-4 text-center text-sm text-rose-200">{state.errors.supervisorRemark}</p>
      ) : null}
      {rows.length === 0 ? (
        <p className="mt-4 text-center text-sm text-white/60">Nothing waiting for your signature.</p>
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
                      if (!window.confirm('Sign this leave request?')) event.preventDefault()
                    }}
                  >
                    <input type="hidden" name="requestId" value={row.id} />
                    <input type="hidden" name="decision" value="sign" />
                    <button type="submit" className={BUTTON_CLASS}>
                      Sign
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
