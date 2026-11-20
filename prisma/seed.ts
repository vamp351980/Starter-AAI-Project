// Task 2 of docs/specs/03-tasks.md — design rule 10: the seed is the only
// writer of users, upserts the six Reference B demo users by email, and
// restores password123 (bcrypt-hashed) on every run.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { DIVISIONS, DEMO_PASSWORD } from '../src/lib/reference-data'

const prisma = new PrismaClient()

const DEMO_PEOPLE = [
  { name: 'Employee 1', icNo: '00-148888', email: 'employee-1@budiman.com', role: 'EMPLOYEE', division: 'Finance', designation: 'Accounts Clerk' },
  { name: 'Supervisor 1', icNo: '00-157777', email: 'supervisor-1@budiman.com', role: 'SUPERVISOR', division: 'Finance', designation: 'Finance Manager' },
  { name: 'Supervisor 2', icNo: '00-166666', email: 'supervisor-2@budiman.com', role: 'SUPERVISOR', division: 'Finance', designation: 'Accountant' },
  { name: 'HR 1', icNo: '00-175555', email: 'hr-1@budiman.com', role: 'HR', division: 'Human Resources', designation: 'HR Officer' },
  { name: 'HR 2', icNo: '00-184444', email: 'hr-2@budiman.com', role: 'HR', division: 'Human Resources', designation: 'HR Officer' },
  { name: 'Admin', icNo: '00-193333', email: 'admin@budiman.com', role: 'ADMIN', division: 'Admin', designation: 'Admin Manager' },
] as const

function validate(person: (typeof DEMO_PEOPLE)[number]): void {
  if (!/^\d{2}-\d{6}$/.test(person.icNo)) {
    throw new Error(`Bad IC no. for ${person.name}: ${person.icNo}`)
  }
  if (!/^[a-z0-9._-]+@budiman\.com$/.test(person.email)) {
    throw new Error(`Bad email for ${person.name}: ${person.email}`)
  }
  if (!DIVISIONS[person.division]) {
    throw new Error(`Unknown division for ${person.name}: ${person.division}`)
  }
  if (!DIVISIONS[person.division].includes(person.designation)) {
    throw new Error(`Designation '${person.designation}' is not a choice for ${person.division}`)
  }
}

async function main(): Promise<void> {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10)
  for (const person of DEMO_PEOPLE) {
    validate(person)
    const email = person.email.toLowerCase()
    await prisma.user.upsert({
      where: { email },
      update: {
        name: person.name,
        icNo: person.icNo,
        password: hashed,
        role: person.role,
        division: person.division,
        designation: person.designation,
      },
      create: {
        name: person.name,
        icNo: person.icNo,
        email,
        password: hashed,
        role: person.role,
        division: person.division,
        designation: person.designation,
      },
    })
    console.log(`Seeded ${email}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
