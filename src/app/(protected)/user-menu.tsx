'use client'

// Task 12 of docs/specs/03-tasks.md (U11, AC-20): the header user menu.
// The trigger pill (name + role badge + chevron) opens a glass dropdown
// with Change password (link to /change-password) and Log out (the same
// logout server action the old header button used). Appearance: design
// §4.1; closing on outside click and Escape is AC-20.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { logout } from '@/app/actions/auth'

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employee',
  SUPERVISOR: 'Supervisor',
  HR: 'HR',
  ADMIN: 'Admin',
}

export default function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs text-white hover:bg-white/25"
      >
        <span>{name}</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase">
          {ROLE_LABELS[role] ?? role}
        </span>
        <svg aria-hidden className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md"
        >
          <Link
            href="/change-password"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Change password
          </Link>
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10"
            >
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
