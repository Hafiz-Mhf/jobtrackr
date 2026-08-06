import { differenceInDays } from 'date-fns'
import type { Job } from '@/types'
import { STALE_DAYS } from '@/lib/constants'

/**
 * The date follow-up timing is measured from: when the user actually applied,
 * falling back to last_updated when no applied date was recorded.
 *
 * Exported so the reminders UI counts days from the same field getStaleJobs
 * filters on. Reading last_updated directly let a job that had been silent for
 * 45 days render "No update in 1 days" once an unrelated edit touched the row.
 */
export function getStaleReference(job: Job): Date {
  return new Date(job.applied_at ?? job.last_updated)
}

/** Whole days since the follow-up clock started for this job. */
export function getStaleDays(job: Job, now: Date = new Date()): number {
  return differenceInDays(now, getStaleReference(job))
}

export function getStaleJobs(jobs: Job[], now: Date = new Date()): Job[] {
  const staleThresholdMs = STALE_DAYS * 24 * 60 * 60 * 1000

  return jobs.filter((job) => {
    if (job.status !== 'applied') return false
    return now.getTime() - getStaleReference(job).getTime() > staleThresholdMs
  })
}
