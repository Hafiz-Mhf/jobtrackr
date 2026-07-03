'use client'

import { useJobs } from '@/hooks/useJobs'
import { useReminders } from '@/hooks/useReminders'
import { Sidebar } from './Sidebar'

export function SidebarWithReminders() {
  const { jobs } = useJobs()
  const { count } = useReminders(jobs)
  return <Sidebar reminderCount={count} />
}
