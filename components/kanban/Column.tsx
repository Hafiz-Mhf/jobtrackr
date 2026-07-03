'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Job, JobStatus } from '@/types'
import { STATUS_LABELS } from '@/lib/constants'
import { JobCard } from './JobCard'

interface Props {
  status: JobStatus
  jobs: Job[]
}

export function Column({ status, jobs }: Props) {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div ref={setNodeRef} className="min-w-[280px] max-w-[300px] bg-surface-muted border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 text-sm font-semibold text-brand-muted uppercase tracking-wide">
        <span>{STATUS_LABELS[status]}</span>
        <span>({jobs.length})</span>
      </div>
      <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
        {jobs.length === 0 && (
          <div className="border border-dashed border-[var(--color-border)] rounded-md p-4 text-center text-xs text-brand-muted">
            No applications here yet
          </div>
        )}
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </SortableContext>
    </div>
  )
}
