import type { JobStatus } from '@/types'
import { STATUS_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const STYLES: Record<JobStatus, string> = {
  saved:     'text-[var(--color-saved)] bg-[#F3F4F6]',
  applied:   'text-[var(--color-applied)] bg-[#EFF6FF]',
  interview: 'text-[var(--color-interview)] bg-[#F5F3FF]',
  offer:     'text-[var(--color-offer)] bg-[#ECFDF5]',
  rejected:  'text-[var(--color-rejected)] bg-[#FFF1F2]',
}

interface Props {
  status: JobStatus
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
        STYLES[status]
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  )
}
