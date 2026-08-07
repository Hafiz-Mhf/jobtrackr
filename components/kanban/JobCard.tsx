import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { Job, JobStatus } from '@/types'
import { getStaleDays, isStale } from '@/lib/reminders'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { JobIcon } from '@/components/jobs/JobIcon'

interface Props {
  job: Job
  /** Rendered inside <DragOverlay> — no sortable wiring, no link, no transitions. */
  overlay?: boolean
}

const STATUS_ICON_COLOR: Record<JobStatus, string> = {
  saved: 'text-[var(--color-saved)]',
  applied: 'text-[var(--color-applied)]',
  interview: 'text-[var(--color-interview)]',
  offer: 'text-[var(--color-offer)]',
  rejected: 'text-[var(--color-rejected)]',
}

const CARD_BASE =
  'relative overflow-hidden bg-surface border border-[var(--color-border)] rounded-2xl p-3 shadow-card select-none'

/**
 * The board's only attention signal. `isStale` also drives the sidebar badge
 * and the /reminders page; without this the board rendered a job silent for 46
 * days identically to one applied yesterday, so the count next to the bell had
 * no answer anywhere on the screen the user actually works in.
 *
 * Same predicate, same wording as /reminders, so the two can never disagree.
 * The state is carried by the words — colour and icon only reinforce it.
 */
function StaleFlag({ job }: { job: Job }) {
  if (!isStale(job)) return null
  const days = getStaleDays(job)

  return (
    <div className="mt-2 flex items-center gap-1.5 rounded-md bg-[var(--color-warning-bg)] px-1.5 py-1 text-[10px] font-semibold text-[var(--color-warning-text)]">
      <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">
        No update in {days} day{days === 1 ? '' : 's'}
      </span>
    </div>
  )
}

function CardBody({ job }: { job: Job }) {
  return (
    <>
      <div className="flex gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded bg-surface-muted flex items-center justify-center shrink-0 border border-[var(--color-border)]/50">
          <JobIcon role={job.role} tags={job.tags} className={cn('size-4.5', STATUS_ICON_COLOR[job.status])} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-brand-text text-[13px] leading-tight truncate" title={job.role}>
            {job.role}
          </h3>
          <p className="text-[11px] text-brand-muted mt-0.5 truncate font-medium" title={job.company}>
            {job.company}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-2.5 text-[10px] text-brand-muted font-mono">
        <span className="truncate">
          {job.applied_at ? `Applied ${formatDate(job.applied_at)}` : formatDate(job.last_updated)}
        </span>
        {job.tags.length > 0 && (
          // One readable tag plus a count beats two tags shrunk to "Re…" —
          // columns are ~222px wide once five of them share the board.
          <div className="flex items-center gap-1 shrink-0">
            <span className="bg-accent-light/60 text-accent px-1.5 py-0 rounded text-[9px] font-mono font-semibold truncate max-w-[84px]">
              {job.tags[0]}
            </span>
            {job.tags.length > 1 && (
              <span className="text-[9px] font-mono font-semibold text-brand-muted">
                +{job.tags.length - 1}
                <span className="sr-only"> more tags</span>
              </span>
            )}
          </div>
        )}
      </div>

      <StaleFlag job={job} />
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

  // The card is one element and one tab stop: a real link that also happens to
  // be draggable. dnd-kit's `attributes` would layer role="button" + its own
  // tabIndex on top of the anchor, which nests a button around a link and costs
  // a second tab stop per card — so only the two attributes that actually help
  // assistive tech are forwarded. Enter follows the link (native), Space starts
  // a keyboard drag (see KEYBOARD_CODES in Board.tsx).
  const dragA11y = {
    'aria-disabled': attributes['aria-disabled'],
    'aria-describedby': attributes['aria-describedby'],
  }

  return (
    <Link
      ref={setNodeRef}
      href={`/jobs/${job.id}`}
      style={style}
      // Suppress the browser's native link-drag ghost; dnd-kit owns dragging.
      draggable={false}
      {...dragA11y}
      {...listeners}
      aria-roledescription="Draggable job card. Press Space to pick up, arrow keys to move, Space to drop."
      data-dragging={isDragging || undefined}
      className={cn(
        CARD_BASE,
        'block cursor-grab card-hover focus-ring',
        // Source card stays in place as the gap placeholder, dimmed.
        isDragging && 'opacity-40 shadow-none'
      )}
      onClick={(e) => {
        if (isDragging) e.preventDefault()
      }}
    >
      <CardBody job={job} />
    </Link>
  )
}

export function JobCard({ job, overlay }: Props) {
  return overlay ? <OverlayCard job={job} /> : <SortableCard job={job} />
}
