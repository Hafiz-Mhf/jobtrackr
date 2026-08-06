'use client'

import Link from 'next/link'
import { Menu } from '@base-ui/react/menu'
import { Avatar } from '@base-ui/react/avatar'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Props {
  profile: Profile | null
  email: string
}

export function Topbar({ profile, email }: Props) {
  const displayName = profile?.full_name || email
  const initials = displayName.slice(0, 1).toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="h-[var(--topbar-height)] border-b border-[var(--color-border)] flex items-center justify-end px-6 bg-surface">
      <div className="flex items-center gap-3">
        <Link
          href="/jobs/new"
          className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 min-h-11 flex items-center rounded-md transition-colors focus-ring"
        >
          Add Job
        </Link>

        <Menu.Root>
          <Menu.Trigger
            aria-label={`Account menu for ${displayName}`}
            className="flex items-center gap-2 rounded-md px-2 min-h-11 text-sm font-medium text-brand-text hover:bg-surface-muted transition-colors focus-ring cursor-pointer"
          >
            <Avatar.Root className="size-7 rounded-full overflow-hidden bg-accent-light flex items-center justify-center text-accent text-xs font-semibold">
              {profile?.avatar_url && (
                <Avatar.Image src={profile.avatar_url} alt="" className="size-full object-cover" />
              )}
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar.Root>
            <span className="max-w-[120px] truncate">{displayName}</span>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={8} align="end" className="z-50">
              <Menu.Popup className="bg-surface border border-[var(--color-border)] rounded-md shadow-lg py-1 min-w-[160px]">
                <Menu.LinkItem
                  render={<Link href="/profile" />}
                  className="flex items-center px-3 min-h-11 text-sm text-brand-text hover:bg-surface-muted cursor-pointer focus-ring"
                >
                  Profile
                </Menu.LinkItem>
                {/* --color-rejected is 3.67:1 as text and fails AA; the
                    error-text step is the one tuned for copy. */}
                <Menu.Item
                  onClick={handleLogout}
                  className="flex items-center px-3 min-h-11 text-sm text-[var(--color-error-text)] hover:bg-surface-muted cursor-pointer focus-ring"
                >
                  Logout
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </header>
  )
}
