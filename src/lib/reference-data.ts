// Reference A of docs/specs/02-design.md — fixed lists from HRMS doc §7.2.
// These are validation lists, not tables. prisma/seed.ts is the only writer
// of users today and checks new rows against these.

export const DIVISIONS: Record<string, readonly string[]> = {
  Finance: ['Finance Manager', 'Accountant', 'Accounts Clerk'],
  'Human Resources': ['HR Manager', 'HR Officer', 'HR Assistant'],
  'Information Technology': ['IT Manager', 'Software Developer', 'IT Support Officer'],
  Operations: ['Operations Manager', 'Operations Supervisor', 'Operations Executive'],
  Marketing: ['Marketing Manager', 'Marketing Executive', 'Marketing Assistant'],
  // Used only by the admin demo account (design Reference A).
  Admin: ['Admin Manager'],
} as const

export const DEMO_PASSWORD = 'password123'
