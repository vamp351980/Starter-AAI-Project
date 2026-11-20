// Leave Request – design §5: the single source for type/status display
// labels, the per-role list queries of LR-10 (Task 15+), and the validators
// of LR-4…LR-6 (Task 20). The queries are the access control (LR-10): a page
// can only ever render the rows its role is allowed to see.

import { prisma } from './db'
import { LeaveStatus, type LeaveRequest, type LeaveType } from '@prisma/client'

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: 'Annual leave',
  MATERNITY: 'Maternity leave',
  UNPAID: 'Unpaid leave',
  COMPASSIONATE: 'Compassionate leave',
  OTHER: 'Other',
}

/** The select order of the leave form (doc §7.2 table order). */
export const LEAVE_TYPES = Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]

/** LR-10 (employee part, Task 15): own rows only, newest submitted first.
 *  The where-clause is the control — hiding rows is only a courtesy. */
export function leaveRequestsForEmployee(employeeId: number): Promise<LeaveRequest[]> {
  return prisma.leaveRequest.findMany({
    where: { employeeId },
    orderBy: { submittedAt: 'desc' },
  })
}

/** A queue row plus the employee name the supervisor needs to see (design §4). */
export type SupervisorRow = LeaveRequest & { employee: { name: string } }

/** LR-10 (supervisor part, Task 16): the signature queue — rows naming this
 *  supervisor that still await the decision. supervisorId is the control. */
export function pendingForSupervisor(supervisorId: number): Promise<SupervisorRow[]> {
  return prisma.leaveRequest.findMany({
    where: { supervisorId, status: LeaveStatus.PENDING_SUPERVISOR },
    orderBy: { submittedAt: 'desc' },
    include: { employee: { select: { name: true } } },
  })
}

/** LR-10 (supervisor part, Task 16): "Your decided requests" — every row
 *  naming this supervisor, any status, newest submitted first. */
export function requestsForSupervisor(supervisorId: number): Promise<SupervisorRow[]> {
  return prisma.leaveRequest.findMany({
    where: { supervisorId },
    orderBy: { submittedAt: 'desc' },
    include: { employee: { select: { name: true } } },
  })
}

/** The Admin list row: everything the All-leave card shows (design §4). */
export type AdminLeaveRow = LeaveRequest & {
  employee: { name: string; division: string }
  hrOfficer: { name: string } | null
}

/** LR-10 (Admin part, Task 21): every request, newest submitted first
 *  (AC-34). Admin is strictly view-only (LR-12) — this query is the whole
 *  of the Admin's leave experience. */
export function allLeaveRequests(): Promise<AdminLeaveRow[]> {
  return prisma.leaveRequest.findMany({
    orderBy: { submittedAt: 'desc' },
    include: {
      employee: { select: { name: true, division: true } },
      hrOfficer: { select: { name: true } },
    },
  })
}

/** A shared-queue row plus the employee name (design §4). */
export type HrQueueRow = LeaveRequest & { employee: { name: string } }

/** A decided row with both names the decisions card shows (design §4). */
export type HrDecisionRow = LeaveRequest & {
  employee: { name: string }
  hrOfficer: { name: string } | null
}

/** LR-10 (HR part, Task 19): the shared queue — every HR user reads the very
 *  same PENDING_HR rows; there is no per-officer filter (doc §5.3.5). */
export function pendingForHr(): Promise<HrQueueRow[]> {
  return prisma.leaveRequest.findMany({
    where: { status: LeaveStatus.PENDING_HR },
    orderBy: { submittedAt: 'desc' },
    include: { employee: { select: { name: true } } },
  })
}

/** LR-10 (HR part, Task 19): HR decisions — only rows that reached a final
 *  HR state, with the officer who decided (FR-05). A supervisor-rejected row
 *  never appears here (AC-33). */
export function hrDecidedRequests(): Promise<HrDecisionRow[]> {
  return prisma.leaveRequest.findMany({
    where: { status: { in: [LeaveStatus.APPROVED, LeaveStatus.REJECTED_HR] } },
    orderBy: { submittedAt: 'desc' },
    include: { employee: { select: { name: true } }, hrOfficer: { select: { name: true } } },
  })
}

export const STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING_SUPERVISOR: 'Pending supervisor',
  SIGNED: 'Signed',
  PENDING_HR: 'Pending HR',
  APPROVED: 'Approved',
  REJECTED_SUPERVISOR: 'Rejected by supervisor',
  REJECTED_HR: 'Rejected by HR',
}

// ---------- Validators of LR-4…LR-6 (Task 20, design §5) ----------
// The submit action calls these; the client only mirrors them.

/** LR-4: the cap on remark/reason text (requirements U13). */
export const REMARK_MAX_LENGTH = 500

/** LR-2 (Task 20): what the card shows when the picker has no options. */
export const NO_SUPERVISOR_MESSAGE = 'No supervisor is available in your division — contact HR'

/** LR-6: the refusal for an overlapping date range (AC-25). */
export const OVERLAP_MESSAGE = 'You already have a request covering those dates.'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** yyyy-mm-dd → UTC-midnight Date, or null when malformed (design §1 note). */
export function toDateOnly(value: string): Date | null {
  if (!DATE_ONLY.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Local calendar date as yyyy-mm-dd (LR-5 compares leave days, not instants). */
export function todayLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** LR-5: end ≥ start, start today or later — as calendar dates, server-side. */
export function validateLeaveDates(
  startDateValue: string,
  endDateValue: string,
): {
  errors: { startDate?: string; endDate?: string }
  startDate: Date | null
  endDate: Date | null
} {
  const errors: { startDate?: string; endDate?: string } = {}
  const startDate = toDateOnly(startDateValue)
  const endDate = toDateOnly(endDateValue)
  if (!startDate) {
    errors.startDate = 'Pick a start date.'
  } else if (startDateValue < todayLocal()) {
    errors.startDate = 'Start date cannot be in the past.'
  }
  if (!endDate) {
    errors.endDate = 'Pick an end date.'
  } else if (startDate && endDateValue < startDateValue) {
    // doc §7.2: end date is not before start date.
    errors.endDate = 'End date cannot be before the start date.'
  }
  return { errors, startDate, endDate }
}

/** LR-4: the Other reason — required then, and capped (doc §7.2). */
export function validateOtherReason(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'Say what the leave is for.'
  if (trimmed.length > REMARK_MAX_LENGTH) {
    return `Reason must be ${REMARK_MAX_LENGTH} characters or fewer.`
  }
  return undefined
}

/**
 * LR-6 (AC-25): an overlap with the employee's own still-open request. Ranges
 * are inclusive calendar days — they overlap when each starts before the
 * other ends. REJECTED_* and APPROVED never block: re-applying after a
 * rejection is the way to fix a rejected request (requirements §5).
 */
export function findOverlappingOpenRequest(
  employeeId: number,
  startDate: Date,
  endDate: Date,
): Promise<LeaveRequest | null> {
  return prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: {
        in: [LeaveStatus.PENDING_SUPERVISOR, LeaveStatus.SIGNED, LeaveStatus.PENDING_HR],
      },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  })
}
