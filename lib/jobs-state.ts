import type { Job } from '@/types'

/**
 * Undo one optimistic row change after its request failed.
 *
 * Deliberately not a whole-array snapshot. A snapshot taken before this
 * request also predates every *other* mutation that landed while it was in
 * flight, so restoring it wipes out concurrent, already-confirmed changes:
 * drag card A, drag card B, A's PATCH fails, and B's confirmed move vanishes
 * from the board until the next refresh. Only the failed row is touched.
 */
export function revertJob(jobs: Job[], before: Job | undefined): Job[] {
  if (!before) return jobs
  return jobs.map((j) => (j.id === before.id ? before : j))
}

/**
 * Put a row back after its DELETE failed, at the position it was removed from.
 * Rows added while the request was open keep their place, and a row that is
 * somehow already back is not duplicated.
 */
export function restoreJob(jobs: Job[], removed: Job | undefined, index: number): Job[] {
  if (!removed) return jobs
  if (jobs.some((j) => j.id === removed.id)) return jobs
  const next = [...jobs]
  next.splice(Math.min(Math.max(index, 0), next.length), 0, removed)
  return next
}
