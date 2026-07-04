'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useJobs } from '@/hooks/useJobs'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { PrepPanel } from '@/components/prep/PrepPanel'
import { JobForm, type JobFormValues } from '@/components/jobs/JobForm'
import { JOB_STATUSES, STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { JobStatus } from '@/types'

/** Drop leading blank/company/role lines so the collapsed preview shows the
 *  actual summary instead of repeating the page headline. */
function summaryPreview(description: string, company: string, role: string): string {
  const skip = new Set([company.trim().toLowerCase(), role.trim().toLowerCase()])
  const lines = description.split('\n')
  let i = 0
  while (i < lines.length && (lines[i].trim() === '' || skip.has(lines[i].trim().toLowerCase()))) i++
  return lines.slice(i).join('\n').trim() || description.trim()
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { jobs, loading, updateJob, updateJobStatus, deleteJob } = useJobs()
  const [editing, setEditing] = useState(false)
  const [showFullJd, setShowFullJd] = useState(false)
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
      <div className="md:sticky md:top-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-brand-muted hover:text-accent transition-colors mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to board
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{job.company}</h1>
            <p className="text-brand-muted">{job.role}</p>
            {job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-xs px-2 py-0.5 rounded-full bg-accent-light text-accent font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm font-medium hover:border-accent hover:text-accent transition-colors"
          >
            <Pencil className="size-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 border border-[var(--color-rejected)]/30 text-[var(--color-rejected)] rounded-md px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-rejected)]/10 transition-colors"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
          <label htmlFor="quick-status" className="ml-auto text-sm text-brand-muted">
            Move to
          </label>
          <select
            id="quick-status"
            value={job.status}
            onChange={(e) => updateJobStatus(id, e.target.value as JobStatus)}
            className="border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm bg-surface"
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <dl className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <dt className="text-brand-muted">Salary</dt>
            <dd className={job.salary_range ? 'font-mono' : 'text-brand-muted italic'}>
              {job.salary_range ?? 'Not listed'}
            </dd>
          </div>
          {job.location && (
            <div><dt className="text-brand-muted">Location</dt><dd>{job.location}</dd></div>
          )}
          {job.applied_at && (
            <div><dt className="text-brand-muted">Applied</dt><dd>{formatDate(job.applied_at)}</dd></div>
          )}
          <div><dt className="text-brand-muted">Last updated</dt><dd>{formatDate(job.last_updated)}</dd></div>
          {job.url && (
            <div className="col-span-2">
              <dt className="text-brand-muted">Link</dt>
              <dd>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline break-all"
                >
                  {job.url}
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              </dd>
            </div>
          )}
        </dl>

        {job.description && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Description</h2>
              <button
                type="button"
                onClick={() => setShowFullJd((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                {showFullJd ? 'Hide full JD' : 'View full JD'}
                <ChevronDown className={`size-3.5 transition-transform ${showFullJd ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <p className={`text-sm whitespace-pre-wrap ${showFullJd ? '' : 'line-clamp-3 text-brand-muted'}`}>
              {showFullJd ? job.description : summaryPreview(job.description, job.company, job.role)}
            </p>
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
