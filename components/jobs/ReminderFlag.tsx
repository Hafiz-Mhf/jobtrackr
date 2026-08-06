import type { Job } from '@/types'
import { getStaleDays } from '@/lib/reminders'

interface Props {
  job: Job
}

/**
 * NOTE: currently unreferenced — nothing imports this. Kept because CLAUDE.md
 * documents it as part of the intended structure, but it is a delete candidate.
 */
export function ReminderFlag({ job }: Props) {
  // Counted from applied_at (falling back to last_updated) via the shared
  // helper. Reading last_updated directly — as this did — reports "1 day" for a
  // job that has actually been silent for weeks, because any unrelated edit
  // touches that column.
  const days = getStaleDays(job)
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-warning-text)] mt-2">
      No update in {days} day{days === 1 ? '' : 's'}
    </div>
  )
}
