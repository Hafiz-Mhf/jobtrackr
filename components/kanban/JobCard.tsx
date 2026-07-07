'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import type { Job } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  job: Job
}

export function JobCard({ job }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-dragging={isDragging}
      className={cn(
        'bg-surface border border-[var(--color-border)] rounded-md p-4 mb-3 cursor-grab shadow-card hover:shadow-card-hover hover:-translate-y-px transition-shadow',
        isDragging && 'shadow-card-drag rotate-1 scale-[1.02] border-accent'
      )}
    >
      <Link href={`/jobs/${job.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <p className="text-base font-semibold text-brand-text">{job.company}</p>
        <p className="text-sm text-brand-muted mt-0.5">{job.role}</p>
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="font-mono text-xs px-2 py-0.5 rounded-full bg-accent-light text-accent font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)] text-xs text-brand-muted font-mono">
          {job.applied_at ? `Applied ${formatDate(job.applied_at)}` : formatDate(job.last_updated)}
        </div>
      </Link>
    </div>
  )
}
