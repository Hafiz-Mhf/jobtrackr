import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { Briefcase, Terminal, Palette, Layers, Code } from 'lucide-react'
import type { Job, JobStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  job: Job
  /** Rendered inside <DragOverlay> — no sortable wiring, no link, no transitions. */
  overlay?: boolean
}

const STATUS_BAR_COLOR: Record<JobStatus, string> = {
  saved: 'bg-[var(--color-saved)]',
  applied: 'bg-[var(--color-applied)]',
  interview: 'bg-[var(--color-interview)]',
  offer: 'bg-[var(--color-offer)]',
  rejected: 'bg-[var(--color-rejected)]',
}

const STATUS_ICON_COLOR: Record<JobStatus, string> = {
  saved: 'text-[var(--color-saved)]',
  applied: 'text-[var(--color-applied)]',
  interview: 'text-[var(--color-interview)]',
  offer: 'text-[var(--color-offer)]',
  rejected: 'text-[var(--color-rejected)]',
}

function getJobIcon(role: string, tags: string[]) {
  const r = role.toLowerCase()
  const merged = [...tags.map((t) => t.toLowerCase()), r]
  if (
    merged.some(
      (t) =>
        t.includes('design') ||
        t.includes('creative') ||
        t.includes('figma') ||
        t.includes('ui') ||
        t.includes('ux') ||
        t.includes('product')
    )
  ) {
    return Palette
  }
  if (
    merged.some(
      (t) =>
        t.includes('frontend') ||
        t.includes('react') ||
        t.includes('web') ||
        t.includes('next.js') ||
        t.includes('typescript') ||
        t.includes('javascript') ||
        t.includes('html') ||
        t.includes('css')
    )
  ) {
    return Code
  }
  if (
    merged.some(
      (t) =>
        t.includes('backend') ||
        t.includes('node') ||
        t.includes('api') ||
        t.includes('database') ||
        t.includes('sql') ||
        t.includes('python') ||
        t.includes('go') ||
        t.includes('terminal')
    )
  ) {
    return Terminal
  }
  if (
    merged.some(
      (t) =>
        t.includes('architect') ||
        t.includes('system') ||
        t.includes('infra') ||
        t.includes('devops') ||
        t.includes('cloud') ||
        t.includes('aws')
    )
  ) {
    return Layers
  }
  return Briefcase
}

const CARD_BASE =
  'relative overflow-hidden bg-surface border border-[var(--color-border)] rounded-2xl p-3 shadow-card select-none'

function CardBody({ job }: { job: Job }) {
  const IconComponent = getJobIcon(job.role, job.tags)

  return (
    <>
      <div className="flex gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded bg-surface-muted flex items-center justify-center shrink-0 border border-[var(--color-border)]/50">
          <IconComponent className={cn('size-4.5', STATUS_ICON_COLOR[job.status])} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-brand-text text-[13px] leading-tight truncate" title={job.role}>
            {job.role}
          </h4>
          <p className="text-[11px] text-brand-muted mt-0.5 truncate font-medium" title={job.company}>
            {job.company}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2.5 text-[10px] text-brand-muted font-mono">
        <span className="truncate max-w-[130px]">
          {job.applied_at ? `Applied ${formatDate(job.applied_at)}` : formatDate(job.last_updated)}
        </span>
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 shrink-0">
            {job.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="bg-accent-light/60 text-accent px-1.5 py-0 rounded text-[9px] font-mono font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// The card that floats under the cursor. Lives in <DragOverlay>, so it escapes
// the board's overflow-x-auto clipping and tracks the pointer 1:1 with no
// transition of its own.
function OverlayCard({ job }: { job: Job }) {
  return (
    <div
      className={cn(
        CARD_BASE,
        'cursor-grabbing rotate-2 scale-[1.03] border-accent shadow-card-drag'
      )}
      style={{ transition: 'none' }}
    >
      <CardBody job={job} />
    </div>
  )
}

function SortableCard({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
  })

  // While this card is the drag source it must not animate — the overlay is
  // what the user sees, and any transition here re-introduces the lag.
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    willChange: transform ? 'transform' : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-dragging={isDragging || undefined}
      className={cn(
        CARD_BASE,
        'cursor-grab card-hover',
        // Source card stays in place as the gap placeholder, dimmed.
        isDragging && 'opacity-40 shadow-none'
      )}
    >
      <Link href={`/jobs/${job.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <CardBody job={job} />
      </Link>
    </div>
  )
}

export function JobCard({ job, overlay }: Props) {
  return overlay ? <OverlayCard job={job} /> : <SortableCard job={job} />
}
