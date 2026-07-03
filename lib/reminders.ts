import type { Job } from '@/types'
import { STALE_DAYS } from '@/lib/constants'

export function getStaleJobs(jobs: Job[], now: Date = new Date()): Job[] {
  const staleThresholdMs = STALE_DAYS * 24 * 60 * 60 * 1000

  return jobs.filter((job) => {
    if (job.status !== 'applied') return false
    const lastUpdated = new Date(job.last_updated).getTime()
    return now.getTime() - lastUpdated > staleThresholdMs
  })
}
