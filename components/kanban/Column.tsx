'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Bookmark, Send, Calendar, Award, XCircle } from 'lucide-react'
import Link from 'next/link'
import type { Job, JobStatus } from '@/types'
import { STATUS_LABELS, STATUS_EMPTY_COPY, STATUS_ACCENT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { JobCard } from './JobCard'

interface Props {
  status: JobStatus
  jobs: Job[]
}

const STATUS_ICONS: Record<JobStatus, React.ComponentType<{ className?: string }>> = {
  saved: Bookmark,
  applied: Send,
  interview: Calendar,
  offer: Award,
  rejected: XCircle,
}

const STATUS_ICON_COLOR: Record<JobStatus, string> = {
  saved: 'text-[var(--color-saved)]',
  applied: 'text-[var(--color-applied)]',
  interview: 'text-[var(--color-interview)]',
  offer: 'text-[var(--color-offer)]',
  rejected: 'text-[var(--color-rejected)]',
}

export function Column({ status, jobs }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const accent = STATUS_ACCENT[status]
  const IconComponent = STATUS_ICONS[status]

  return (
    <div
      ref={setNodeRef}
      data-over={isOver || undefined}
      className={cn(
        'min-h-[500px] flex flex-col bg-surface-muted/50 border border-[var(--color-border)] rounded-2xl p-3 shadow-sm',
        'transition-colors duration-150',
        isOver && 'bg-accent-light/40 border-accent ring-2 ring-accent/25'
      )}
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
            <div
              className={cn(
                'flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-2xl p-4 text-center gap-2 min-h-[150px]',
                'transition-colors duration-150',
                isOver && 'border-accent'
              )}
            >
              <div className="size-8 rounded-lg bg-surface flex items-center justify-center border border-[var(--color-border)]/50 shadow-sm shrink-0">
                <IconComponent className={`size-4 ${STATUS_ICON_COLOR[status]}`} />
              </div>
              <p className="text-[11px] text-brand-muted leading-normal px-2">
                {STATUS_EMPTY_COPY[status]}
              </p>
              <Link
                href={`/jobs/new?status=${status}`}
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline"
              >
                + Add job
              </Link>
            </div>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </SortableContext>
    </div>
  )
}
