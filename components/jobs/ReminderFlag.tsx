import { differenceInDays } from 'date-fns'
import type { Job } from '@/types'

interface Props {
  job: Job
}

export function ReminderFlag({ job }: Props) {
  const days = differenceInDays(new Date(), new Date(job.last_updated))
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-[#F59E0B] mt-2">
      No update in {days} days
    </div>
  )
}
