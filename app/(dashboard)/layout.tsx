import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { SidebarWithReminders } from '@/components/layout/SidebarWithReminders'
import { JobsProvider } from '@/contexts/JobsProvider'
import { TagsProvider } from '@/contexts/TagsProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <JobsProvider>
      <TagsProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          {/* Without this, reaching page content by keyboard means tabbing
              through the whole sidebar and topbar on every navigation. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-surface focus:text-brand-text focus:font-semibold focus:text-sm focus:px-4 focus:py-3 focus:rounded-xl focus:border focus:border-[var(--color-border)] focus:shadow-card-hover focus-ring"
          >
            Skip to main content
          </a>
          <div className="hidden md:block shrink-0 h-full">
            <SidebarWithReminders />
          </div>
          <div className="flex-1 flex flex-col h-full min-w-0">
            <Topbar profile={profile} email={user!.email ?? ''} />
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto pb-16 md:pb-0">
              <div className="min-h-full flex flex-col justify-between">
                <div className="flex-1">{children}</div>
                {/* Legal chrome, not content: it sits at the end of the scroll
                    without the marketing-sized gap that used to precede it. */}
                <footer className="py-4 border-t border-[var(--color-border)]/40">
                  <div className="max-w-[var(--content-max)] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] font-mono text-brand-muted">
                    <p>&copy; {new Date().getFullYear()} JobTrackr</p>
                    <div className="flex gap-5">
                      <Link href="/privacy" className="rounded px-0.5 hover:text-accent transition-colors focus-ring">
                        Privacy
                      </Link>
                      <Link href="/terms" className="rounded px-0.5 hover:text-accent transition-colors focus-ring">
                        Terms
                      </Link>
                      <Link href="/support" className="rounded px-0.5 hover:text-accent transition-colors focus-ring">
                        Support
                      </Link>
                    </div>
                  </div>
                </footer>
              </div>
            </main>
          </div>
          <MobileNav />
        </div>
      </TagsProvider>
    </JobsProvider>
  )
}
