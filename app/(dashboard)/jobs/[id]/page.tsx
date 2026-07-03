'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJobs } from '@/hooks/useJobs'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { PrepPanel } from '@/components/prep/PrepPanel'
import { JobForm, type JobFormValues } from '@/components/jobs/JobForm'
import { formatDate } from '@/lib/utils'

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { jobs, loading, updateJob, deleteJob } = useJobs()
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  const job = jobs.find((j) => j.id === id)

  if (loading) return <div className="p-6 text-sm text-brand-muted">Loading...</div>
  if (!job) return <div className="p-6 text-sm text-brand-muted">Job not found.</div>

  async function handleUpdate(values: JobFormValues) {
    await updateJob(id, values)
    setEditing(false)
  }

  async function handleDelete() {
    await deleteJob(id)
    router.push('/jobs')
  }

  if (editing) {
    return (
      <div className="p-6 max-w-2xl">
        <JobForm initial={job} onSubmit={handleUpdate} submitLabel="Save changes" />
      </div>
    )
  }

  return (
    <div className="p-6 grid md:grid-cols-[1fr_360px] gap-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{job.company}</h1>
            <p className="text-brand-muted">{job.role}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={() => setEditing(true)} className="text-sm text-accent underline">Edit</button>
          <button onClick={handleDelete} className="text-sm text-[var(--color-rejected)] underline">Delete</button>
        </div>

        <dl className="grid grid-cols-2 gap-4 mt-6 text-sm">
          {job.salary_range && (
            <div><dt className="text-brand-muted">Salary</dt><dd className="font-mono">{job.salary_range}</dd></div>
          )}
          {job.location && (
            <div><dt className="text-brand-muted">Location</dt><dd>{job.location}</dd></div>
          )}
          <div><dt className="text-brand-muted">Last updated</dt><dd>{formatDate(job.last_updated)}</dd></div>
        </dl>

        {job.description && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold mb-2">Description</h2>
            <p className="text-sm whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {job.notes && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold mb-2">Notes</h2>
            <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}
      </div>

      <PrepPanel tags={job.tags} />
    </div>
  )
}
