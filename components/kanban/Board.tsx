'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  KeyboardCodes,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { Briefcase, Plus, RotateCw } from 'lucide-react'
import Link from 'next/link'
import { useJobs } from '@/hooks/useJobs'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { JOB_STATUSES, STATUS_ACCENT, STATUS_LABELS } from '@/lib/constants'
import { stagger, fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { Job, JobStatus } from '@/types'
import { Column } from './Column'
import { JobCard } from './JobCard'
import { RejectionModal } from './RejectionModal'
import { BoardSkeleton } from '@/components/ui/Skeleton'

function resolveTargetStatus(overId: string, jobs: Job[]): JobStatus | null {
  if (JOB_STATUSES.includes(overId as JobStatus)) {
    return overId as JobStatus
  }
  const overJob = jobs.find((j) => j.id === overId)
  return overJob ? overJob.status : null
}

// Column heights change as cards move between them, so droppable rects have to
// be re-measured continuously or drop targets go stale mid-drag.
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } }

const DROP_ANIMATION: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
}

// Space alone picks up and drops. dnd-kit's default also binds Enter, which on
// a card — now a real anchor with one tab stop — has to stay free to follow the
// link. See the comment in JobCard's SortableCard.
const KEYBOARD_CODES: KeyboardCodes = {
  start: ['Space'],
  cancel: ['Escape'],
  end: ['Space'],
}

/**
 * Stage rail shown whenever the board scrolls horizontally (below `xl`).
 * Five columns off the right edge with nothing but a sliver of the next one is
 * invisible on a phone — this names every stage, carries its count, and jumps
 * to it. It doubles as the "there is more board over here" signal.
 */
function StageRail({
  jobs,
  activeStage,
  onSelect,
}: {
  jobs: Job[]
  activeStage: JobStatus
  onSelect: (status: JobStatus) => void
}) {
  return (
    <nav
      aria-label="Jump to pipeline stage"
      className="flex gap-1.5 overflow-x-auto scrollbar-none px-6 pt-4 xl:hidden"
    >
      {JOB_STATUSES.map((status) => {
        const count = jobs.filter((j) => j.status === status).length
        const active = status === activeStage
        return (
          <button
            key={status}
            type="button"
            onClick={() => onSelect(status)}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-ring',
              active
                ? 'bg-accent-light border-accent/40 text-accent'
                : 'bg-surface border-[var(--color-border)] text-brand-muted hover:text-brand-text'
            )}
          >
            <span
              className={cn('size-1.5 rounded-full', STATUS_ACCENT[status].dot)}
              aria-hidden="true"
            />
            {STATUS_LABELS[status]}
            <span className="font-mono font-bold opacity-70">{count}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function Board() {
  const { jobs, loading, error, updateJobStatus, refresh } = useJobs()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Long-press to drag on touch, so vertical scrolling of the board still works.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: KEYBOARD_CODES,
    })
  )
  // When a card is dragged into Rejected we hold its id and prompt for a reason
  // before committing the move.
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : undefined
  // The drop animation runs through the Web Animations API, so the global
  // reduced-motion CSS rule cannot suppress it — opt out here instead.
  const reducedMotion = usePrefersReducedMotion()

  const scrollerRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef(new Map<JobStatus, HTMLElement>())
  const [activeStage, setActiveStage] = useState<JobStatus>(JOB_STATUSES[0])
  const [atScrollEnd, setAtScrollEnd] = useState(true)

  // Which stage the rail highlights, and whether the right-edge fade still has
  // board left to point at. Both derive from scroll position, so they share a pass.
  const syncScrollState = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    setAtScrollEnd(scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 8)

    const originLeft = scroller.getBoundingClientRect().left
    let nearest = JOB_STATUSES[0]
    let smallestDelta = Infinity
    for (const status of JOB_STATUSES) {
      const el = columnRefs.current.get(status)
      if (!el) continue
      const delta = Math.abs(el.getBoundingClientRect().left - originLeft)
      if (delta < smallestDelta) {
        smallestDelta = delta
        nearest = status
      }
    }
    setActiveStage(nearest)
  }, [])

  useEffect(() => {
    syncScrollState()
    window.addEventListener('resize', syncScrollState)
    return () => window.removeEventListener('resize', syncScrollState)
  }, [syncScrollState, jobs.length])

  const goToStage = useCallback(
    (status: JobStatus) => {
      columnRefs.current.get(status)?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        inline: 'start',
        // The board sits inside the vertically-scrolling <main>; without this
        // the horizontal jump drags the page up or down with it.
        block: 'nearest',
      })
    },
    [reducedMotion]
  )

  function commitStatus(jobId: string, status: JobStatus, reason?: string) {
    updateJobStatus(jobId, status, reason).catch(() => {
      // useJobs reverts optimistic state + toasts on failure.
    })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const jobId = active.id as string
    const targetStatus = resolveTargetStatus(over.id as string, jobs)
    const job = jobs.find((j) => j.id === jobId)
    if (!job || !targetStatus || job.status === targetStatus) return

    if (targetStatus === 'rejected') {
      setPendingRejectId(jobId)
      return
    }
    commitStatus(jobId, targetStatus)
  }

  if (loading) {
    return <BoardSkeleton />
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center text-center py-24 px-6 min-h-[calc(100vh-var(--topbar-height)-110px)]"
      >
        <h2 className="text-base font-bold text-brand-text mb-1.5">Your board didn&apos;t load</h2>
        <p className="text-sm text-brand-muted max-w-sm leading-relaxed mb-5">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg hover:shadow-accent/15 active:scale-[0.98] transition-all focus-ring cursor-pointer"
        >
          <RotateCw className="size-4" />
          Try again
        </button>
      </div>
    )
  }

  // First-time empty state — all columns empty
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6 min-h-[calc(100vh-var(--topbar-height)-110px)]">
        <div className="size-20 rounded-2xl bg-accent-light flex items-center justify-center mb-6 shadow-sm animate-float">
          <Briefcase className="size-9 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-brand-text mb-2">Your job pipeline starts here</h2>
        <p className="text-sm text-brand-muted max-w-sm leading-relaxed mb-6">
          Paste a job description or add one manually — we&apos;ll extract the details and organize everything on your Kanban board.
        </p>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-6 py-3 text-sm font-semibold shadow-md hover:shadow-lg hover:shadow-accent/15 active:scale-[0.98] transition-all"
        >
          <Plus className="size-4.5" />
          Add your first application
        </Link>
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={MEASURING}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <StageRail jobs={jobs} activeStage={activeStage} onSelect={goToStage} />

        <div className="relative">
          <motion.div
            ref={scrollerRef}
            onScroll={syncScrollState}
            initial={reducedMotion ? false : 'hidden'}
            animate="visible"
            variants={stagger(0.06)}
            // Below xl the board scrolls horizontally (with the rail above as
            // the signpost). At xl it becomes a 5-track grid, where each track
            // is minmax(0,1fr) — so the last column can no longer be clipped
            // off the right edge at ordinary laptop widths.
            // Height comes from the columns' own min-height. Forcing a viewport-
            // sized board on top of that left a screen of empty page under short
            // columns and put the footer permanently below the fold.
            className="flex gap-3 px-6 pb-6 pt-3 items-start overflow-x-auto xl:grid xl:grid-cols-5 xl:overflow-x-visible"
          >
            {JOB_STATUSES.map((status) => (
              <motion.div
                key={status}
                ref={(el) => {
                  if (el) columnRefs.current.set(status, el)
                  else columnRefs.current.delete(status)
                }}
                variants={fadeUp}
                className="flex-1 min-w-[240px] max-w-[285px] scroll-ml-6 xl:min-w-0 xl:max-w-none"
              >
                <Column status={status} jobs={jobs.filter((j) => j.status === status)} />
              </motion.div>
            ))}
          </motion.div>

          {/* Fades the cut-off column instead of letting it end mid-card. */}
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--color-bg)] to-transparent transition-opacity duration-200 xl:hidden',
              atScrollEnd ? 'opacity-0' : 'opacity-100'
            )}
          />
        </div>

        <DragOverlay dropAnimation={reducedMotion ? null : DROP_ANIMATION}>
          {activeJob ? <JobCard job={activeJob} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <RejectionModal
        open={pendingRejectId !== null}
        onSelect={(reason) => {
          if (pendingRejectId) commitStatus(pendingRejectId, 'rejected', reason)
          setPendingRejectId(null)
        }}
        onSkip={() => {
          if (pendingRejectId) commitStatus(pendingRejectId, 'rejected', '')
          setPendingRejectId(null)
        }}
        onCancel={() => setPendingRejectId(null)}
      />
    </>
  )
}

