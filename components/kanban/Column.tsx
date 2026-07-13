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
      className="flex-1 min-w-[240px] max-w-[285px] min-h-[500px] flex flex-col bg-surface-muted/50 border border-[var(--color-border)] rounded-2xl p-3 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3 text-[13px] font-bold text-brand-muted uppercase tracking-wider px-1">
        <span className="flex items-center gap-1.5 text-brand-text">
          <span className={`size-1.5 rounded-full ${accent.dot}`} aria-hidden="true" />
          {STATUS_LABELS[status]}
        </span>
        <span className="bg-surface border border-[var(--color-border)] px-1.5 py-0.5 rounded-md font-mono text-[10px] text-brand-muted">
          {jobs.length}
        </span>
      </div>
      <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 flex flex-col gap-2.5 min-h-[300px]">
          {jobs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-2xl p-4 text-center text-[11px] text-brand-muted leading-relaxed">
              {STATUS_EMPTY_COPY[status]}
            </div>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </SortableContext>
    </div>
  )
}
