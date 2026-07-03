'use client'

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useJobs } from '@/hooks/useJobs'
import { JOB_STATUSES } from '@/lib/constants'
import type { JobStatus } from '@/types'
import { Column } from './Column'

export function Board() {
  const { jobs, loading, error, updateJobStatus } = useJobs()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const jobId = active.id as string
    const targetStatus = over.id as JobStatus
    const job = jobs.find((j) => j.id === jobId)
    if (!job || job.status === targetStatus || !JOB_STATUSES.includes(targetStatus)) return

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
      <div className="flex gap-4 p-6 overflow-x-auto items-start min-h-[calc(100vh-var(--topbar-height))]">
        {JOB_STATUSES.map((status) => (
          <Column key={status} status={status} jobs={jobs.filter((j) => j.status === status)} />
        ))}
      </div>
    </DndContext>
  )
}
