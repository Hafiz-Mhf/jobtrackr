'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, List, Plus, Bell, PanelLeftClose, PanelLeftOpen, LogOut, Settings, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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

// localStorage is an external store, so read it as one. Setting state from an
// effect on mount worked but is a cascading render; useSyncExternalStore gets
// the same no-hydration-mismatch result by rendering the server snapshot first
// and swapping to the real value during hydration.
const collapsedListeners = new Set<() => void>()

function subscribeCollapsed(onChange: () => void) {
  collapsedListeners.add(onChange)
  // Keep multiple tabs in step.
  window.addEventListener('storage', onChange)
  return () => {
    collapsedListeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function getCollapsedSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function getCollapsedServerSnapshot() {
  return false
}

function setCollapsed(next: boolean) {
  localStorage.setItem(STORAGE_KEY, String(next))
  collapsedListeners.forEach((listener) => listener())
}

export function Sidebar({ reminderCount }: Props) {
  const pathname = usePathname()
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot
  )

  function toggle() {
    setCollapsed(!collapsed)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 py-2.5 text-sm font-medium text-brand-muted hover:bg-accent-light hover:text-accent rounded-xl transition-all focus-ring',
      collapsed ? 'justify-center px-2' : 'px-4',
      active && 'bg-accent-light/60 text-accent font-bold'
    )

  return (
    <aside
      className={cn(
        'h-full bg-surface-muted border-r border-[var(--color-border)] py-4 flex flex-col justify-between transition-[width] duration-200 ease-out shrink-0 z-40',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      <div className="space-y-6">
        {/* Logo Header */}
        <div className={cn('flex items-center justify-between px-4', collapsed && 'justify-center')}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
              <Briefcase className="size-4.5" />
            </div>
            {!collapsed && (
              <div>
                {/* Wordmark, not a page heading — each page owns its own h1. */}
                <p className="font-bold text-[15px] text-brand-text leading-none">JobTrackr</p>
                <p className="text-[9px] uppercase tracking-wider text-brand-muted font-bold mt-0.5">
                  Career Manager
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={toggle}
              aria-label="Collapse sidebar"
              className="text-brand-muted hover:text-accent hover:bg-accent-light rounded-md p-1 transition-colors focus-ring cursor-pointer"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {/* Collapsed Expand Toggle */}
        {collapsed && (
          <div className="flex justify-center px-4">
            <button
              type="button"
              onClick={toggle}
              aria-label="Expand sidebar"
              className="text-brand-muted hover:text-accent hover:bg-accent-light rounded-md p-1 transition-colors focus-ring cursor-pointer"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}

        {/* Navigation items */}
        <nav className="space-y-0.5 pr-2">
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
        </nav>
      </div>

      {/* Footer Block */}
      <div className="space-y-4">
        {/* New Application Button (Desktop Expanded Only) */}
        {!collapsed && (
          <div className="px-4">
            <Link
              href="/jobs/new"
              className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:shadow-accent/15 active:scale-[0.98] transition-all focus-ring"
            >
              <Plus className="size-4" />
              New Application
            </Link>
          </div>
        )}

        {/* Settings & Logout links */}
        <div className="space-y-0.5 pr-2 border-t border-[var(--color-border)]/50 pt-3">
          <Link
            href="/profile"
            title={collapsed ? 'Settings' : undefined}
            className={linkClass(pathname === '/profile')}
          >
            <Settings size={16} className="shrink-0" />
            {!collapsed && 'Settings'}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={cn(
              'w-full flex items-center gap-3 py-2.5 text-sm font-medium text-[var(--color-rejected)] hover:bg-[var(--color-rejected)]/5 hover:text-[var(--color-rejected)] rounded-xl transition-all cursor-pointer focus-ring',
              collapsed ? 'justify-center px-2' : 'px-4'
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </div>
    </aside>
  )
}
