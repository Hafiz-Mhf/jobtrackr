'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, List, Plus, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Board' },
  { href: '/jobs', icon: List, label: 'Jobs' },
  { href: '/jobs/new', icon: Plus, label: 'Add' },
  { href: '/reminders', icon: Bell, label: 'Alerts' },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-surface border-t border-[var(--color-border)] flex items-center justify-around z-10">
      {ITEMS.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex flex-col items-center gap-0.5 text-[10px] text-brand-muted',
            pathname === href && 'text-accent'
          )}
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  )
}
