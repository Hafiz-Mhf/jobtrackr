'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, List, Plus, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  reminderCount: number
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/jobs', label: 'All Jobs', icon: List },
  { href: '/jobs/new', label: 'Add Job', icon: Plus },
]

export function Sidebar({ reminderCount }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-[var(--sidebar-width)] h-screen bg-surface-muted border-r border-[var(--color-border)] p-4 flex flex-col gap-2">
      <div className="px-2 py-3 font-semibold text-accent">JobTrackr</div>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-brand-muted hover:bg-accent-light hover:text-accent transition-colors',
            pathname === href && 'bg-accent-light text-accent font-semibold'
          )}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
      <Link
        href="/reminders"
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-brand-muted hover:bg-accent-light hover:text-accent transition-colors',
          pathname === '/reminders' && 'bg-accent-light text-accent font-semibold'
        )}
      >
        <Bell size={16} />
        Reminders
        {reminderCount > 0 && (
          <span className="ml-auto bg-[var(--color-rejected)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {reminderCount}
          </span>
        )}
      </Link>
    </aside>
  )
}
