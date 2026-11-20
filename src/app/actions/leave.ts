'use server'

// Leave Request – design §5: the only writers of LeaveRequest (LR-3). Every
// action re-checks on the server, in order (LR-3): session → role → row
// exists → expected current status → ownership. Forms are untrusted input;
// hiding a button is never the control (design §6, OWASP A01).

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  findOverlappingOpenRequest,
  LEAVE_TYPES,
  OVERLAP_MESSAGE,
  validateLeaveDates,
  validateOtherReason,
} from '@/lib/leave'
import { requireUser } from '@/lib/session'
import { LeaveStatus, LeaveType, Role } from '@prisma/client'

export type SubmitLeaveState = {
  errors?: {
    leaveType?: string
    otherLeaveType?: string
    startDate?: string
    endDate?: string
    supervisorId?: string
  }
  message?: string
  success?: string
}

/**
 * Task 14 / U12, AC-21…24 (doc §5.3.3, FR-02): an employee submits a request
 * as PENDING_SUPERVISOR. The supervisor must be a SUPERVISOR of the
 * employee's own division (LR-2, AC-24) — the id comes from the form and is
 * re-read from the database, never trusted. Dates follow LR-5.
 */
export async function submitLeaveRequest(
  _previous: SubmitLeaveState | undefined,
  formData: FormData,
): Promise<SubmitLeaveState> {
  const user = await requireUser('EMPLOYEE')

  const leaveType = String(formData.get('leaveType') ?? '') as LeaveType
  const otherLeaveType = String(formData.get('otherLeaveType') ?? '').trim()
  const startDateValue = String(formData.get('startDate') ?? '')
  const endDateValue = String(formData.get('endDate') ?? '')
  const supervisorId = Number(formData.get('supervisorId'))

  const errors: NonNullable<SubmitLeaveState['errors']> = {}

  if (!LEAVE_TYPES.includes(leaveType)) {
    errors.leaveType = 'Choose a leave type.'
  }
  if (leaveType === LeaveType.OTHER) {
    // doc §7.2: "Other leave type — Required then"; LR-4 caps it too.
    const reasonError = validateOtherReason(otherLeaveType)
    if (reasonError) {
      errors.otherLeaveType = reasonError
    }
  }

  // LR-5 (validators live in src/lib/leave.ts, design §5). Assign only real
  // errors — an undefined-valued key would count in Object.keys below.
  const dates = validateLeaveDates(startDateValue, endDateValue)
  if (dates.errors.startDate) errors.startDate = dates.errors.startDate
  if (dates.errors.endDate) errors.endDate = dates.errors.endDate
  const startDate = dates.startDate
  const endDate = dates.endDate

  let chosenSupervisor = null
  if (!Number.isInteger(supervisorId) || supervisorId <= 0) {
    errors.supervisorId = 'Choose a supervisor.'
  } else {
    chosenSupervisor = await prisma.user.findUnique({ where: { id: supervisorId } })
    if (
      !chosenSupervisor ||
      chosenSupervisor.role !== Role.SUPERVISOR ||
      chosenSupervisor.division !== user.division
    ) {
      // LR-2 / AC-24: the picker only offers division supervisors; a
      // hand-crafted POST with a foreign id lands here and is refused.
      errors.supervisorId = 'Choose a supervisor from your own division.'
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  // LR-6 / AC-25: refuse an overlap with this employee's own open request
  // (final requests never block).
  const clash = await findOverlappingOpenRequest(user.id, startDate!, endDate!)
  if (clash) {
    return { errors: { startDate: OVERLAP_MESSAGE } }
  }

  await prisma.leaveRequest.create({
    data: {
      employeeId: user.id,
      supervisorId: chosenSupervisor!.id,
      leaveType,
      otherLeaveType: leaveType === LeaveType.OTHER ? otherLeaveType : null,
      startDate: startDate!,
      endDate: endDate!,
      status: LeaveStatus.PENDING_SUPERVISOR,
    },
  })
  // Task 23: the submit form lives on /employee/new-request — refresh both
  // the form's own route and the home list the success belongs to.
  revalidatePath('/employee')
  revalidatePath('/employee/new-request')
  return { success: 'Leave request submitted — waiting for your supervisor.' }
}

export type SupervisorDecisionState = {
  message?: string
  success?: string
  errors?: { supervisorRemark?: string }
}

/**
 * Task 16+17 / U14, AC-26…28 (design §2): the named supervisor signs a
 * pending request (PENDING_SUPERVISOR → SIGNED, signedAt set by the server)
 * or rejects it **with a remark** (→ REJECTED_SUPERVISOR, supervisorRemark +
 * decidedAt, LR-4/8). The LR-3 chain runs in spec order — role, row, expected
 * status, ownership — so a hand-crafted requestId from another supervisor's
 * queue is refused (AC-28) and a stale page cannot decide twice (LR-7).
 */
export async function supervisorDecide(
  _previous: SupervisorDecisionState | undefined,
  formData: FormData,
): Promise<SupervisorDecisionState> {
  const user = await requireUser('SUPERVISOR')

  const requestId = Number(formData.get('requestId'))
  const decision = String(formData.get('decision') ?? '')

  const request = Number.isInteger(requestId)
    ? await prisma.leaveRequest.findUnique({ where: { id: requestId } })
    : null
  if (!request) {
    return { message: 'Leave request not found.' }
  }

  if (decision !== 'sign' && decision !== 'reject') {
    return { message: 'Unknown decision.' }
  }
  if (request.status !== LeaveStatus.PENDING_SUPERVISOR) {
    // LR-7: first decision wins — a stale queue cannot decide a row twice.
    return { message: 'This request has already been decided.' }
  }
  if (request.supervisorId !== user.id) {
    // AC-28: the id in the form carries no authority.
    return { message: 'This request is not assigned to you.' }
  }

  if (decision === 'sign') {
    await prisma.leaveRequest.update({
      where: { id: request.id },
      data: { status: LeaveStatus.SIGNED, signedAt: new Date() },
    })
    revalidatePath('/supervisor')
    revalidatePath('/employee')
    return { success: 'Request signed — the employee can now send it to HR.' }
  }

  // Reject (AC-27): a remark is required and capped (LR-4). The client caps
  // the input at 500 too, but this check is the control.
  const remark = String(formData.get('remark') ?? '').trim()
  if (!remark) {
    return { errors: { supervisorRemark: 'A remark is required.' } }
  }
  if (remark.length > 500) {
    return { errors: { supervisorRemark: 'Remark must be 500 characters or fewer.' } }
  }
  await prisma.leaveRequest.update({
    where: { id: request.id },
    data: {
      status: LeaveStatus.REJECTED_SUPERVISOR,
      supervisorRemark: remark,
      decidedAt: new Date(),
    },
  })
  revalidatePath('/supervisor')
  revalidatePath('/employee')
  return { success: 'Request rejected — the employee can see your remark.' }
}

export type SendToHrState = {
  message?: string
  success?: string
}

/**
 * Task 18 / U15, AC-29…30 (design §2, LR-9): the **owning** employee sends
 * their own Signed request to the shared HR queue (SIGNED → PENDING_HR —
 * the only employee-initiated move besides submit). The LR-3 chain refuses
 * anything else: an unsigned row, an already-sent row, a foreign id.
 */
export async function sendToHr(
  _previous: SendToHrState | undefined,
  formData: FormData,
): Promise<SendToHrState> {
  const user = await requireUser('EMPLOYEE')

  const requestId = Number(formData.get('requestId'))
  const request = Number.isInteger(requestId)
    ? await prisma.leaveRequest.findUnique({ where: { id: requestId } })
    : null
  if (!request) {
    return { message: 'Leave request not found.' }
  }
  if (request.status === LeaveStatus.PENDING_HR) {
    return { message: 'This request is already with HR.' }
  }
  if (request.status !== LeaveStatus.SIGNED) {
    // AC-30: never Signed, or already final — the pill never showed and the
    // hand-crafted POST lands here.
    return { message: 'This request is not ready to send — it must be Signed first.' }
  }
  if (request.employeeId !== user.id) {
    // AC-30: only the owner sends; the id in the form carries no authority.
    return { message: 'This is not your request.' }
  }

  await prisma.leaveRequest.update({
    where: { id: request.id },
    data: { status: LeaveStatus.PENDING_HR },
  })
  revalidatePath('/employee')
  return { success: 'Sent to HR — waiting for a decision.' }
}

export type HrDecisionState = {
  message?: string
  success?: string
  errors?: { hrRemark?: string }
}

/**
 * Task 19 / U16, AC-31…33 (design §2, LR-7/8): any HR user decides a row in
 * the shared queue. The status must still be PENDING_HR — the first decision
 * is the record (AC-32: "Already decided by {name}"), a stale colleague page
 * changes nothing. Approve sets APPROVED; reject requires a remark (LR-4) and
 * sets REJECTED_HR; both record hrOfficerId + decidedAt.
 */
export async function hrDecide(
  _previous: HrDecisionState | undefined,
  formData: FormData,
): Promise<HrDecisionState> {
  const user = await requireUser('HR')

  const requestId = Number(formData.get('requestId'))
  const decision = String(formData.get('decision') ?? '')

  const request = Number.isInteger(requestId)
    ? await prisma.leaveRequest.findUnique({
        where: { id: requestId },
        include: { hrOfficer: { select: { name: true } } },
      })
    : null
  if (!request) {
    return { message: 'Leave request not found.' }
  }
  if (decision !== 'approve' && decision !== 'reject') {
    return { message: 'Unknown decision.' }
  }
  if (request.status !== LeaveStatus.PENDING_HR) {
    if (
      request.status === LeaveStatus.APPROVED ||
      request.status === LeaveStatus.REJECTED_HR ||
      request.status === LeaveStatus.REJECTED_SUPERVISOR
    ) {
      // LR-7 / AC-32: a second officer's stale page is refused — the first
      // decision stands.
      return { message: `Already decided by ${request.hrOfficer?.name ?? 'the supervisor'}.` }
    }
    // Still with the supervisor or unsigned — it never joined this queue.
    return { message: 'This request has not reached the HR queue yet.' }
  }

  if (decision === 'approve') {
    await prisma.leaveRequest.update({
      where: { id: request.id },
      data: { status: LeaveStatus.APPROVED, hrOfficerId: user.id, decidedAt: new Date() },
    })
    revalidatePath('/hr')
    revalidatePath('/employee')
    return { success: 'Request approved — the employee can see the decision.' }
  }

  // Reject (AC-31): a remark is required and capped (LR-4).
  const remark = String(formData.get('remark') ?? '').trim()
  if (!remark) {
    return { errors: { hrRemark: 'A remark is required.' } }
  }
  if (remark.length > 500) {
    return { errors: { hrRemark: 'Remark must be 500 characters or fewer.' } }
  }
  await prisma.leaveRequest.update({
    where: { id: request.id },
    data: {
      status: LeaveStatus.REJECTED_HR,
      hrOfficerId: user.id,
      hrRemark: remark,
      decidedAt: new Date(),
    },
  })
  revalidatePath('/hr')
  revalidatePath('/employee')
  return { success: 'Request rejected — the employee can see your remark.' }
}
