import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // reminderCount hardcoded to 0 here; Task 26 replaces this with useReminders() output
  // fed down from a client wrapper once jobs data-fetching (Task 17) exists.
  const reminderCount = 0

  return (
    <div className="flex">
      <div className="hidden md:block">
        <Sidebar reminderCount={reminderCount} />
      </div>
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
