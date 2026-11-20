'use client'

// Task 14 (U12, AC-21…24, FR-02/FR-07): the New leave request card. The real
// checks (division supervisor LR-2, dates LR-5, Other-reason doc §7.2) run in
// the submitLeaveRequest server action; this component only shows what it
// returns. Look: design §4.1 (pill inputs, blue pill button, rose field
// errors, emerald success) and the FR-07 confirm-before-action pattern of the
// Admin reset form.

import { useState } from 'react'
import { useActionState } from 'react'
import { submitLeaveRequest, type SubmitLeaveState } from '@/app/actions/leave'
import { LEAVE_TYPES, LEAVE_TYPE_LABELS, NO_SUPERVISOR_MESSAGE, REMARK_MAX_LENGTH } from '@/lib/leave'

const FIELD_CLASS =
  'w-full rounded-full border border-white/20 bg-white/15 px-5 py-2.5 text-white placeholder-white/60 focus:border-white/60 focus:outline-none'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1 px-5 text-xs text-rose-200" role="alert">
      {message}
    </p>
  )
}

export function LeaveForm({ supervisors }: { supervisors: { id: number; name: string }[] }) {
  const [state, formAction, pending] = useActionState<SubmitLeaveState | undefined, FormData>(
    submitLeaveRequest,
    undefined,
  )
  const [leaveType, setLeaveType] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  // LR-2 / AC-25 (Task 20): a division with no supervisor gets the friendly
  // message — there is nothing to submit. (Hooks above always run.)
  if (supervisors.length === 0) {
    return <p className="text-center text-sm text-amber-100">{NO_SUPERVISOR_MESSAGE}</p>
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        // FR-07 / AC-35: dismiss means nothing is sent.
        if (!window.confirm('Submit this leave request?')) {
          event.preventDefault()
        }
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="leaveType" className="sr-only">
          Leave type
        </label>
        <select
          id="leaveType"
          name="leaveType"
          required
          value={leaveType}
          onChange={(event) => setLeaveType(event.target.value)}
          className={`${FIELD_CLASS} appearance-none [&>option]:text-slate-900`}
        >
          <option value="">Leave type</option>
          {LEAVE_TYPES.map((type) => (
            <option key={type} value={type}>
              {LEAVE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <FieldError message={state?.errors?.leaveType} />
      </div>

      {leaveType === 'OTHER' && (
        <div>
          <label htmlFor="otherLeaveType" className="sr-only">
            What is the leave for?
          </label>
          <textarea
            id="otherLeaveType"
            name="otherLeaveType"
            rows={2}
            maxLength={REMARK_MAX_LENGTH}
            placeholder="What is the leave for?"
            className={`${FIELD_CLASS} rounded-3xl`}
          />
          <FieldError message={state?.errors?.otherLeaveType} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="sr-only">
            Start date
          </label>
          <input id="startDate" name="startDate" type="date" required min={today} className={FIELD_CLASS} />
          <FieldError message={state?.errors?.startDate} />
        </div>
        <div>
          <label htmlFor="endDate" className="sr-only">
            End date
          </label>
          <input id="endDate" name="endDate" type="date" required min={today} className={FIELD_CLASS} />
          <FieldError message={state?.errors?.endDate} />
        </div>
      </div>

      <div>
        <label htmlFor="supervisorId" className="sr-only">
          Supervisor
        </label>
        <select
          id="supervisorId"
          name="supervisorId"
          required
          className={`${FIELD_CLASS} appearance-none [&>option]:text-slate-900`}
        >
          <option value="">Supervisor (own division)</option>
          {supervisors.map((supervisor) => (
            <option key={supervisor.id} value={supervisor.id}>
              {supervisor.name}
            </option>
          ))}
        </select>
        <FieldError message={state?.errors?.supervisorId} />
      </div>

      {state?.message && (
        <p role="alert" className="text-center text-sm font-semibold text-rose-200">
          {state.message}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-center text-sm font-semibold text-emerald-200">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  )
}
