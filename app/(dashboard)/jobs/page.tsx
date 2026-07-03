'use client'

import Link from 'next/link'
import { useJobs } from '@/hooks/useJobs'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { formatDate } from '@/lib/utils'

export default function JobsListPage() {
  const { jobs, loading, error } = useJobs()

  if (loading) return <div className="p-6 text-sm text-brand-muted">Loading jobs...</div>
  if (error) return <div className="p-6 text-sm text-[var(--color-rejected)]">{error}</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">All Jobs</h1>
      {jobs.length === 0 && (
        <p className="text-sm text-brand-muted">No applications yet. <Link href="/jobs/new" className="text-accent underline">Add one</Link>.</p>
      )}
      <div className="space-y-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between bg-surface border border-[var(--color-border)] rounded-md p-4"
          >
            <div>
              <p className="font-semibold">{job.company}</p>
              <p className="text-sm text-brand-muted">{job.role}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-brand-muted font-mono">{formatDate(job.last_updated)}</span>
              <StatusBadge status={job.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
