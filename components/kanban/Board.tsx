'use client'

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useJobs } from '@/hooks/useJobs'
import { JOB_STATUSES } from '@/lib/constants'
import type { Job, JobStatus } from '@/types'
import { Column } from './Column'

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const jobId = active.id as string
    const targetStatus = resolveTargetStatus(over.id as string, jobs)
    const job = jobs.find((j) => j.id === jobId)
    if (!job || !targetStatus || job.status === targetStatus) return

    updateJobStatus(jobId, targetStatus).catch(() => {
      // useJobs already reverts optimistic state on failure; surface via toast in Task 27
    })
  }

  if (loading) {
    return <div className="p-6 text-sm text-brand-muted">Loading board...</div>
  }

  if (error) {
    return <div className="p-6 text-sm text-[var(--color-rejected)]">{error}</div>
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-5 gap-4 p-6 items-start min-h-[calc(100vh-var(--topbar-height))] min-w-225 overflow-x-auto">
        {JOB_STATUSES.map((status) => (
          <Column key={status} status={status} jobs={jobs.filter((j) => j.status === status)} />
        ))}
      </div>
    </DndContext>
  )
}
