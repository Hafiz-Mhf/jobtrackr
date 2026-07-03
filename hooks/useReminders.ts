'use client'

import { useMemo } from 'react'
import type { Job } from '@/types'
import { getStaleJobs } from '@/lib/reminders'

export function useReminders(jobs: Job[]) {
  const staleJobs = useMemo(() => getStaleJobs(jobs), [jobs])
  return { staleJobs, count: staleJobs.length }
}
