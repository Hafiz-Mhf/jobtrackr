'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
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
import { Briefcase, Plus } from 'lucide-react'
import Link from 'next/link'
import { useJobs } from '@/hooks/useJobs'
import { JOB_STATUSES } from '@/lib/constants'
import { stagger, fadeUp } from '@/lib/animations'
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

export function Board() {
  const { jobs, loading, error, updateJobStatus } = useJobs()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Long-press to drag on touch, so vertical scrolling of the board still works.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  // When a card is dragged into Rejected we hold its id and prompt for a reason
  // before committing the move.
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : undefined

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
    return <div className="p-6 text-sm text-[var(--color-rejected)]">{error}</div>
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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger(0.06)}
          className="flex gap-3 p-6 pt-4 items-start min-h-[calc(100vh-var(--topbar-height)-110px)] overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        >
          {JOB_STATUSES.map((status) => (
            <motion.div key={status} variants={fadeUp} className="flex-1 min-w-[240px] max-w-[285px]">
              <Column status={status} jobs={jobs.filter((j) => j.status === status)} />
            </motion.div>
          ))}
        </motion.div>

        <DragOverlay dropAnimation={DROP_ANIMATION}>
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

