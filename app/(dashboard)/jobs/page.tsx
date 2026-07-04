'use client'

import Link from 'next/link'
import { Briefcase, ChevronRight, Plus } from 'lucide-react'
import { useJobs } from '@/hooks/useJobs'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { formatDate } from '@/lib/utils'

export default function JobsListPage() {
  const { jobs, loading, error } = useJobs()

  if (loading) return <div className="p-6 text-sm text-brand-muted">Loading jobs...</div>
  if (error) return <div className="p-6 text-sm text-[var(--color-rejected)]">{error}</div>

  if (jobs.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">All Jobs</h1>
        <div className="flex flex-col items-center justify-center text-center py-24">
          <div className="size-16 rounded-full bg-accent-light flex items-center justify-center mb-5">
            <Briefcase className="size-7 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-brand-text">No applications yet</h2>
          <p className="text-sm text-brand-muted mt-1 max-w-xs">
            Paste a job description or add one manually — we&apos;ll pull out the details for you.
          </p>
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 mt-6 bg-accent text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            <Plus className="size-4" />
            Add your first job
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl font-semibold">All Jobs</h1>
        <span className="text-sm text-brand-muted">
          Showing {jobs.length} {jobs.length === 1 ? 'application' : 'applications'}
        </span>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => {
          const meta = [job.role, job.location, job.salary_range].filter(Boolean).join(' · ')
          return (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="group flex items-center justify-between gap-4 bg-surface border border-[var(--color-border)] rounded-md p-4 shadow-sm hover:border-accent hover:shadow-card-hover transition-all"
            >
              <div className="min-w-0">
                <p className="font-semibold text-brand-text">{job.company}</p>
                <p className="text-sm text-brand-muted truncate">{meta}</p>
                {job.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.tags.slice(0, 6).map((tag) => (
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
              <div className="flex items-center gap-4 shrink-0">
                <span className="hidden sm:inline text-xs text-brand-muted font-mono">
                  {formatDate(job.last_updated)}
                </span>
                <StatusBadge status={job.status} />
                <ChevronRight className="size-4 text-brand-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
