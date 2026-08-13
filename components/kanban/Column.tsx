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
    // A lane, not a card. The column used to carry its own border + surface +
    // shadow, which put a card around every card — the one nesting the design
    // system explicitly bans. Chrome now appears only while it is a drop target.
    <section
      ref={setNodeRef}
      data-over={isOver || undefined}
      aria-labelledby={`column-${status}`}
      className={cn(
        'min-h-[500px] flex flex-col rounded-2xl p-2',
        'transition-colors duration-150 ring-1 ring-transparent',
        isOver && 'bg-accent-light/40 ring-accent/40'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <h2
          id={`column-${status}`}
          className="flex items-center gap-1.5 min-w-0 text-[13px] font-bold text-brand-text uppercase tracking-wider"
        >
          <span className={`size-1.5 rounded-full shrink-0 ${accent.dot}`} aria-hidden="true" />
          <span className="truncate">{STATUS_LABELS[status]}</span>
          {/* The badge beside this heading is decorative; the count is announced here. */}
          <span className="sr-only">, {jobs.length === 1 ? '1 job' : `${jobs.length} jobs`}</span>
        </h2>
        <span
          aria-hidden="true"
          className="shrink-0 bg-surface-muted px-2 py-1 rounded-md font-mono text-[10px] leading-none font-bold text-brand-muted"
        >
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
              <div className="size-8 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
                <IconComponent className={`size-4 ${STATUS_ICON_COLOR[status]}`} />
              </div>
              <p className="text-[11px] text-brand-muted leading-normal px-2">
                {STATUS_EMPTY_COPY[status]}
              </p>
              <Link
                href={`/jobs/new?status=${status}`}
                className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-accent hover:underline focus-ring"
              >
                + Add job
                <span className="sr-only">to {STATUS_LABELS[status]}</span>
              </Link>
            </div>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </SortableContext>
    </section>
  )
}
