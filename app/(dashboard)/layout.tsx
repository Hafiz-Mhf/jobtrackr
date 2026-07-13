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
          <div className="hidden md:block shrink-0 h-full">
            <SidebarWithReminders />
          </div>
          <div className="flex-1 flex flex-col h-full min-w-0">
            <Topbar profile={profile} email={user!.email ?? ''} />
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
              <div className="min-h-full flex flex-col justify-between">
                <div className="flex-1">{children}</div>
                <footer className="py-6 border-t border-[var(--color-border)]/40 mt-12 bg-surface/30">
                  <div className="max-w-max-content-width mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-brand-muted">
                    <p>&copy; {new Date().getFullYear()} JobTrackr. All rights reserved.</p>
                    <div className="flex gap-6">
                      <Link href="/privacy" className="hover:text-accent transition-colors">
                        Privacy Policy
                      </Link>
                      <Link href="/terms" className="hover:text-accent transition-colors">
                        Terms of Service
                      </Link>
                      <Link href="/support" className="hover:text-accent transition-colors">
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
