'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Job, JobStatus } from '@/types'
import type { JobFormValues } from '@/components/jobs/JobForm'

interface JobsListResponse {
  data: Job[]
  error?: string
}

interface JobResponse {
  data: Job
  error?: string
}

function toTagsArray(tags: JobFormValues['tags']): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function useJobs() {
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
    refresh()
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
    return json.data
  }, [])

  const updateJobStatus = useCallback(async (id: string, status: JobStatus): Promise<void> => {
    let previous: Job[] = []
    setJobs((prev) => {
      previous = prev
      return prev.map((j) => (j.id === id ? { ...j, status } : j))
    })
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      setJobs(previous)
      throw new Error("Couldn't update status.")
    }
  }, [])

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
      throw new Error("Couldn't delete job.")
    }
  }, [])

  return { jobs, loading, error, createJob, updateJobStatus, updateJob, deleteJob, refresh }
}
