import type { Job } from '@/types'
import { STALE_DAYS } from '@/lib/constants'

export function getStaleJobs(jobs: Job[], now: Date = new Date()): Job[] {
  const staleThresholdMs = STALE_DAYS * 24 * 60 * 60 * 1000

  return jobs.filter((job) => {
    if (job.status !== 'applied') return false
    // Follow-up timing is measured from when the user actually applied;
    // fall back to last_updated when no applied date was recorded.
    const reference = job.applied_at ?? job.last_updated
    const referenceMs = new Date(reference).getTime()
    return now.getTime() - referenceMs > staleThresholdMs
  })
}
