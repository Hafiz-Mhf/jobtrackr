'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, List, Plus, Bell, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  reminderCount: number
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/jobs', label: 'All Jobs', icon: List },
  { href: '/jobs/new', label: 'Add Job', icon: Plus },
]

const STORAGE_KEY = 'jobtrackr:sidebar-collapsed'

export function Sidebar({ reminderCount }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Read persisted state after mount to avoid SSR/CSR hydration mismatch.
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  function toggle() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 py-2.5 rounded-md text-sm font-medium text-brand-muted hover:bg-accent-light hover:text-accent transition-colors',
      collapsed ? 'justify-center px-2' : 'px-3',
      active && 'bg-accent-light text-accent font-semibold'
    )

  return (
    <aside
      className={cn(
        'h-screen bg-surface-muted border-r border-[var(--color-border)] p-4 flex flex-col gap-2 transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-[var(--sidebar-width)]'
      )}
    >
      <div className={cn('flex items-center py-3', collapsed ? 'justify-center' : 'justify-between px-2')}>
        {!collapsed && (
          <span className="text-2xl font-bold tracking-tight text-accent">JobTrackr</span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-brand-muted hover:text-accent hover:bg-accent-light rounded-md p-1.5 transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          title={collapsed ? label : undefined}
          className={linkClass(pathname === href)}
        >
          <Icon size={16} className="shrink-0" />
          {!collapsed && label}
        </Link>
      ))}

      <Link
        href="/reminders"
        title={collapsed ? 'Reminders' : undefined}
        className={cn(linkClass(pathname === '/reminders'), 'relative')}
      >
        <Bell size={16} className="shrink-0" />
        {!collapsed && 'Reminders'}
        {reminderCount > 0 &&
          (collapsed ? (
            <span className="absolute top-1.5 right-2.5 size-2 rounded-full bg-[var(--color-rejected)]" />
          ) : (
            <span className="ml-auto bg-[var(--color-rejected)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {reminderCount}
            </span>
          ))}
      </Link>
    </aside>
  )
}
