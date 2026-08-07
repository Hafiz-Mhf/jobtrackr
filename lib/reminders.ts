import { differenceInDays } from 'date-fns'
import type { Job } from '@/types'
import { STALE_THRESHOLDS } from '@/lib/constants'

/**
 * The date follow-up timing is measured from.
 *
 * `applied` measures from when the user actually applied, falling back to
 * `last_updated` when no applied date was recorded.
 *
 * Every other stage measures from `status_changed_at` — when the job entered
 * that stage. `applied_at` is wrong here (it dates the application, so an
 * interview scheduled yesterday would read as six months silent) and
 * `last_updated` is wrong too (it moves on any edit, so changing the notes on a
 * quiet interview restarted its clock and it silently stopped being flagged).
 * The column exists specifically to separate "this row was touched" from "this
 * job moved".
 *
 * Exported so every follow-up surface counts days from the field the stale
 * filter actually tests.
 */
export function getStaleReference(job: Job): Date {
  if (job.status === 'applied') {
    return new Date(job.applied_at ?? job.last_updated)
  }
  return new Date(job.status_changed_at ?? job.last_updated)
}

/** Whole days since the follow-up clock started for this job. */
export function getStaleDays(job: Job, now: Date = new Date()): number {
  return differenceInDays(now, getStaleReference(job))
}

/** Days this job may sit in its stage before it needs chasing; null if never. */
export function getStaleThreshold(job: Job): number | null {
  return STALE_THRESHOLDS[job.status] ?? null
}

/**
 * The single predicate for "needs a follow-up". The board card, the sidebar
 * badge and the reminders list all read it, so the amber flag on a card and the
 * count next to the bell cannot disagree about which jobs qualify.
 */
export function isStale(job: Job, now: Date = new Date()): boolean {
  const threshold = getStaleThreshold(job)
  if (threshold === null) return false
  const thresholdMs = threshold * 24 * 60 * 60 * 1000
  return now.getTime() - getStaleReference(job).getTime() > thresholdMs
}

export function getStaleJobs(jobs: Job[], now: Date = new Date()): Job[] {
  return jobs.filter((job) => isStale(job, now))
}
