import type { Job } from '@/types'

export interface WeeklyStats {
  appliedThisWeek: number
  activeInterviews: number
  offers: number
  rejectedThisWeek: number
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function withinWeek(iso: string | undefined, now: Date): boolean {
  if (!iso) return false
  const diff = now.getTime() - new Date(iso).getTime()
  return diff >= 0 && diff <= WEEK_MS
}

export function getWeeklyStats(jobs: Job[], now: Date = new Date()): WeeklyStats {
  return {
    appliedThisWeek: jobs.filter((j) => withinWeek(j.applied_at, now)).length,
    activeInterviews: jobs.filter((j) => j.status === 'interview').length,
    offers: jobs.filter((j) => j.status === 'offer').length,
    rejectedThisWeek: jobs.filter((j) => withinWeek(j.rejected_at, now)).length,
  }
}
