'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, List, Plus, Bell } from 'lucide-react'
import { useJobs } from '@/hooks/useJobs'
import { useReminders } from '@/hooks/useReminders'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Board' },
  { href: '/jobs', icon: List, label: 'Jobs' },
  { href: '/jobs/new', icon: Plus, label: 'Add' },
  { href: '/reminders', icon: Bell, label: 'Alerts' },
]

function isActive(pathname: string, href: string) {
  if (href === '/jobs') {
    // /jobs/new has its own tab, but /jobs/<id> should still light up Jobs.
    return pathname === '/jobs' || (pathname.startsWith('/jobs/') && pathname !== '/jobs/new')
  }
  return pathname === href
}

export function MobileNav() {
  const pathname = usePathname()
  const { jobs } = useJobs()
  const { count } = useReminders(jobs)

  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-surface border-t border-[var(--color-border)] flex items-stretch justify-around z-10"
    >
      {ITEMS.map(({ href, icon: Icon, label }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex-1 min-w-11 flex flex-col items-center justify-center gap-0.5 text-[11px] focus-ring',
              active ? 'text-accent font-semibold' : 'text-brand-muted'
            )}
          >
            {/* Colour alone can't carry the active state (WCAG 1.4.1), so the
                current tab also gets a marker bar and heavier label. */}
            {active && (
              <span
                aria-hidden="true"
                className="absolute top-0 h-0.5 w-8 rounded-full bg-accent"
              />
            )}
            <span className="relative">
              <Icon size={20} aria-hidden="true" />
              {/* aria-hidden: the count is announced by the sr-only phrase
                  below, otherwise the name reads "1Alerts, 1 needing…". */}
              {href === '/reminders' && count > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center"
                >
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </span>
            {label}
            {href === '/reminders' && count > 0 && (
              <span className="sr-only">, {count} needing follow-up</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
