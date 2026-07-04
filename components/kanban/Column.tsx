'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Job, JobStatus } from '@/types'
import { STATUS_LABELS, STATUS_EMPTY_COPY, STATUS_ACCENT } from '@/lib/constants'
import { JobCard } from './JobCard'

interface Props {
  status: JobStatus
  jobs: Job[]
}

export function Column({ status, jobs }: Props) {
  const { setNodeRef } = useDroppable({ id: status })
  const accent = STATUS_ACCENT[status]

  return (
    <div
      ref={setNodeRef}
      className={`min-w-0 min-h-80 flex flex-col bg-surface-muted border border-l-4 border-[var(--color-border)] ${accent.border} rounded-lg p-4 shadow-sm`}
    >
      <div className="flex items-center justify-between mb-3 text-sm font-semibold text-brand-muted uppercase tracking-wide">
        <span className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${accent.dot}`} aria-hidden="true" />
          {STATUS_LABELS[status]}
        </span>
        <span>({jobs.length})</span>
      </div>
      <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
        {jobs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-md p-4 text-center text-xs text-brand-muted">
            {STATUS_EMPTY_COPY[status]}
          </div>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </SortableContext>
    </div>
  )
}
