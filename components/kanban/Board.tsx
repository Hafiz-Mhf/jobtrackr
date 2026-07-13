'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useJobs } from '@/hooks/useJobs'
import { JOB_STATUSES } from '@/lib/constants'
import type { Job, JobStatus } from '@/types'
import { Column } from './Column'
import { RejectionModal } from './RejectionModal'

function resolveTargetStatus(overId: string, jobs: Job[]): JobStatus | null {
  if (JOB_STATUSES.includes(overId as JobStatus)) {
    return overId as JobStatus
  }
  const overJob = jobs.find((j) => j.id === overId)
  return overJob ? overJob.status : null
}

export function Board() {
  const { jobs, loading, error, updateJobStatus } = useJobs()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  // When a card is dragged into Rejected we hold its id and prompt for a reason
  // before committing the move.
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null)

  function commitStatus(jobId: string, status: JobStatus, reason?: string) {
    updateJobStatus(jobId, status, reason).catch(() => {
      // useJobs reverts optimistic state + toasts on failure.
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
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
    return <div className="p-6 text-sm text-brand-muted">Loading board...</div>
  }

  if (error) {
    return <div className="p-6 text-sm text-[var(--color-rejected)]">{error}</div>
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 p-6 pt-4 items-start min-h-[calc(100vh-var(--topbar-height)-110px)] overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {JOB_STATUSES.map((status) => (
            <Column key={status} status={status} jobs={jobs.filter((j) => j.status === status)} />
          ))}
        </div>
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
