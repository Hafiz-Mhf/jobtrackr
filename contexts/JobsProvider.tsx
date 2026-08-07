'use client'

import { createContext, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Job, JobStatus } from '@/types'
import type { JobFormValues } from '@/components/jobs/JobForm'
import { STATUS_LABELS } from '@/lib/constants'

interface JobsListResponse {
  data: Job[]
  error?: string
}

interface JobResponse {
  data: Job
  error?: string
}

export interface JobsContextValue {
  jobs: Job[]
  loading: boolean
  error: string | null
  createJob: (values: Partial<JobFormValues>) => Promise<Job>
  updateJobStatus: (id: string, status: JobStatus, reason?: string) => Promise<void>
  updateJob: (id: string, values: Partial<JobFormValues>) => Promise<Job>
  deleteJob: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

export const JobsContext = createContext<JobsContextValue | null>(null)

function toTagsArray(tags: JobFormValues['tags']): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs')
      const json = (await res.json()) as JobsListResponse
      if (!res.ok) throw new Error(json.error)
      setJobs(json.data)
    } catch {
      setError("Couldn't load jobs. Try refreshing the page.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])

  const createJob = useCallback(async (values: Partial<JobFormValues>): Promise<Job> => {
    const payload = {
      ...values,
      tags: values.tags !== undefined ? toTagsArray(values.tags) : undefined,
    }
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = (await res.json()) as JobResponse
    if (!res.ok) throw new Error(json.error)
    setJobs((prev) => [json.data, ...prev])
    toast.success(`Job saved — ${json.data.company} · ${json.data.role}`)
    return json.data
  }, [])

  // Shared by a normal status change and by Undo. Returns the job as it stood
  // before the move so the caller can offer a way back to it.
  const patchStatus = useCallback(async (id: string, status: JobStatus, reason?: string): Promise<Job | undefined> => {
    let previous: Job[] = []
    let before: Job | undefined
    // Both are captured inside the updater, not around it: React runs the
    // updater during the re-render, so reading `previous` on the line after
    // setJobs still sees the empty initial value. Only safe to read once the
    // await below has yielded — which is what the revert path already relied on.
    // status_changed_at moves with the status here too. The server stamps the
    // real value, but without it the optimistic row keeps the old stage's clock
    // and a card moved into Interview can flash an "out of date" flag for the
    // length of the request.
    const movedAt = new Date().toISOString()
    setJobs((prev) => {
      previous = prev
      before = prev.find((j) => j.id === id)
      return prev.map((j) => (j.id === id ? { ...j, status, status_changed_at: movedAt } : j))
    })
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reason !== undefined ? { status, rejection_reason: reason } : { status }),
    })
    if (!res.ok) {
      setJobs(previous)
      toast.error("Couldn't update status.", { duration: Infinity })
      throw new Error("Couldn't update status.")
    }
    const json = (await res.json()) as JobResponse
    // Replace with the server row so rejected_at / cleared reason stay in sync.
    setJobs((prev) => prev.map((j) => (j.id === id ? json.data : j)))
    return before
  }, [])

  const updateJobStatus = useCallback(async (id: string, status: JobStatus, reason?: string): Promise<void> => {
    const before = await patchStatus(id, status, reason)

    if (!before || before.status === status) {
      toast.success(`Moved to ${STATUS_LABELS[status]}`)
      return
    }

    // A mis-drop is a single gesture and used to be permanent. Undo re-runs the
    // same PATCH in reverse, restoring the rejection reason when the job is
    // going back to Rejected. It deliberately offers no Undo of its own, so the
    // two can't ping-pong.
    //
    // Caveat: rejected_at is server-owned and stamped on the transition INTO
    // rejected, so undoing a move OUT of Rejected re-dates the rejection to
    // now, and the job counts toward "Rejected this week" again.
    toast.success(`Moved to ${STATUS_LABELS[status]}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          void patchStatus(id, before.status, before.rejection_reason ?? undefined)
            .then(() => toast.success(`Moved back to ${STATUS_LABELS[before.status]}`))
            .catch(() => {
              // patchStatus already reverted the optimistic state and toasted.
            })
        },
      },
    })
  }, [patchStatus])

  const updateJob = useCallback(async (id: string, values: Partial<JobFormValues>): Promise<Job> => {
    const payload = {
      ...values,
      tags: values.tags !== undefined ? toTagsArray(values.tags) : undefined,
    }
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = (await res.json()) as JobResponse
    if (!res.ok) throw new Error(json.error)
    setJobs((prev) => prev.map((j) => (j.id === id ? json.data : j)))
    return json.data
  }, [])

  const deleteJob = useCallback(async (id: string): Promise<void> => {
    let previous: Job[] = []
    setJobs((prev) => {
      previous = prev
      return prev.filter((j) => j.id !== id)
    })
    const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setJobs(previous)
      toast.error("Couldn't delete job.", { duration: Infinity })
      throw new Error("Couldn't delete job.")
    }
  }, [])

  const value: JobsContextValue = {
    jobs,
    loading,
    error,
    createJob,
    updateJobStatus,
    updateJob,
    deleteJob,
    refresh,
  }

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>
}
