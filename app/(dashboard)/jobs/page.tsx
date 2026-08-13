'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Briefcase, ChevronRight, Plus, Search, Calendar, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useJobs } from '@/hooks/useJobs'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { JobIcon } from '@/components/jobs/JobIcon'
import { stagger, fadeUp } from '@/lib/animations'
import { JobListSkeleton } from '@/components/ui/Skeleton'
import { LoadFailure } from '@/components/ui/LoadFailure'
import type { Job, JobStatus } from '@/types'

const STATUS_ICON_COLOR: Record<JobStatus, string> = {
  saved: 'text-[var(--color-saved)]',
  applied: 'text-[var(--color-applied)]',
  interview: 'text-[var(--color-interview)]',
  offer: 'text-[var(--color-offer)]',
  rejected: 'text-[var(--color-rejected)]',
}

/**
 * The date a row shows, and the date it sorts by — deliberately the same value.
 * Matches JobCard on the board so the two views stop reporting different dates
 * for the same job.
 */
function rowDate(job: Job): { label: string; value: number } {
  const iso = job.applied_at || job.last_updated
  return {
    label: job.applied_at ? `Applied ${formatDate(iso)}` : `Updated ${formatDate(iso)}`,
    value: new Date(iso).getTime(),
  }
}

export default function JobsListPage() {
  const { jobs, loading, error, refresh } = useJobs()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const reducedMotion = usePrefersReducedMotion()

  if (loading) return <JobListSkeleton />

  if (error) {
    return (
      <div className="p-6 max-w-[var(--content-max)] mx-auto">
        <LoadFailure
          as="h1"
          title="Your applications didn't load"
          message={error}
          onRetry={() => void refresh()}
        />
      </div>
    )
  }

  const query = searchQuery.trim().toLowerCase()

  const filteredJobs = jobs
    .filter((job) => {
      const matchSearch =
        !query ||
        job.company.toLowerCase().includes(query) ||
        job.role.toLowerCase().includes(query) ||
        (job.tags && job.tags.some((t) => t.toLowerCase().includes(query)))
      const matchStatus = selectedStatus === 'all' || job.status === selectedStatus
      return matchSearch && matchStatus
    })
    // Sorted by the same field the row displays — ordering by created_at while
    // showing a different date made the list look shuffled.
    .sort((a, b) => rowDate(b).value - rowDate(a).value)

  const filtersActive = query !== '' || selectedStatus !== 'all'
  function clearFilters() {
    setSearchQuery('')
    setSelectedStatus('all')
  }

  // Empty State (no jobs overall)
  if (jobs.length === 0) {
    return (
      <div className="p-6 max-w-[var(--content-max)] mx-auto flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center text-center py-20 bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
          <div className="size-16 rounded-2xl bg-accent-light flex items-center justify-center mb-5 shadow-sm">
            <Briefcase className="size-7 text-accent" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-brand-text">No applications yet</h1>
          <p className="text-sm text-brand-muted mt-1 max-w-xs leading-relaxed">
            Paste a job description or add one manually — we&apos;ll pull out the details for you.
          </p>
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 mt-6 bg-accent hover:bg-accent-hover text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md active:scale-[0.98] transition-all"
          >
            <Plus className="size-4.5" />
            Add your first job
          </Link>
        </div>
      </div>
    )
  }

  // Count items per category
  const getStatusCount = (status: string) => {
    if (status === 'all') return jobs.length
    return jobs.filter((j) => j.status === status).length
  }

  const statusFilterTabs = [
    { id: 'all', label: 'All' },
    { id: 'saved', label: 'Saved' },
    { id: 'applied', label: 'Applied' },
    { id: 'interview', label: 'Interview' },
    { id: 'offer', label: 'Offer' },
    { id: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="p-6 max-w-[var(--content-max)] mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-bold text-brand-text text-2xl md:text-3xl">All Applications</h1>
          <p className="text-brand-muted text-sm mt-1" aria-live="polite">
            Showing {filteredJobs.length} of {jobs.length} applications
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center justify-center gap-2 min-h-11 bg-accent hover:bg-accent-hover text-white rounded-xl px-5 text-sm font-semibold shadow-md active:scale-[0.98] transition-colors focus-ring self-start sm:self-auto"
        >
          <Plus className="size-4.5" aria-hidden="true" />
          Add Job
        </Link>
      </div>

      {/* Search and Filters panel */}
      <div className="flex flex-col gap-4 bg-surface border border-[var(--color-border)] rounded-2xl p-4 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-brand-muted"
            aria-hidden="true"
          />
          <input
            id="jobs-search"
            type="search"
            // The placeholder was the only name this input had, and it vanishes
            // the moment the user types.
            aria-label="Search applications by company, role, or skill"
            placeholder="Search by company, role, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            // pr-12 clears the 44px clear button parked on the right, so a long
            // query never runs underneath it.
            className="w-full min-h-11 border border-[var(--color-border)] rounded-xl pl-10 pr-12 py-2.5 text-sm bg-surface text-brand-text focus:border-accent focus-ring transition-colors placeholder:text-brand-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery !== '' && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-lg text-brand-muted hover:text-brand-text hover:bg-surface-muted transition-colors focus-ring cursor-pointer"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filter Tabs — the strip scrolls on narrow screens, so it carries a
            fade on the right edge; Offer and Rejected used to sit off-screen
            behind a hidden scrollbar with nothing to suggest they existed. */}
        <div className="relative -mx-1">
          <div
            role="group"
            aria-label="Filter by status"
            className="flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none scroll-smooth"
          >
          {statusFilterTabs.map((tab) => {
            const active = selectedStatus === tab.id
            const count = getStatusCount(tab.id)
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                // Without this a screen reader can filter the list and never
                // learn which filter is on.
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors active:scale-[0.97] cursor-pointer focus-ring',
                  active
                    ? 'bg-accent text-white border-accent shadow-sm shadow-accent/15'
                    : 'bg-surface border-[var(--color-border)] text-brand-muted hover:border-accent hover:text-accent'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'font-mono text-[10px] px-1.5 py-0.5 rounded-md font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-surface-muted text-brand-muted'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--color-surface)] to-transparent sm:hidden"
          />
        </div>
      </div>

      {/* Applications List */}
      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 bg-surface border border-[var(--color-border)] rounded-2xl px-6 shadow-sm">
          <div className="size-12 rounded-xl bg-surface-muted flex items-center justify-center mb-4">
            <Search className="size-5 text-brand-muted" aria-hidden="true" />
          </div>
          <p className="text-sm text-brand-text font-semibold">
            {query
              ? <>No matches for &ldquo;{searchQuery.trim()}&rdquo;</>
              : 'Nothing in this stage yet'}
            {selectedStatus !== 'all' && (
              <> in {statusFilterTabs.find((t) => t.id === selectedStatus)?.label}</>
            )}
          </p>
          <p className="text-sm text-brand-muted mt-1 max-w-xs leading-relaxed">
            Try a different search, or widen the filter.
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 inline-flex items-center gap-2 border border-[var(--color-border)] hover:border-accent hover:text-accent text-brand-text rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-ring cursor-pointer"
            >
              <X className="size-4" />
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <motion.div
          initial={reducedMotion ? false : 'hidden'}
          animate="visible"
          variants={stagger(0.04)}
          className="grid gap-4"
        >
          {filteredJobs.map((job) => {
            // Plain text joined in JSX. This used to be an HTML string fed to
            // dangerouslySetInnerHTML — from parsed job-posting text — to render
            // one bullet character.
            const meta = [job.location, job.salary_range].filter(Boolean)
            const date = rowDate(job)

            return (
              <motion.div key={job.id} variants={fadeUp}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="bg-surface border border-[var(--color-border)] rounded-2xl p-5 shadow-card card-hover focus-ring flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-surface-muted rounded-xl flex items-center justify-center shrink-0">
                      <JobIcon role={job.role} tags={job.tags} className={cn('size-6', STATUS_ICON_COLOR[job.status])} />
                    </div>
                    <div className="space-y-1">
                      <h2 className="font-bold text-brand-text text-base leading-snug group-hover:text-accent transition-colors">
                        {job.role}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-brand-muted text-sm">{job.company}</span>
                        <StatusBadge status={job.status} />
                      </div>
                      {meta.length > 0 && (
                        <p className="text-xs text-brand-muted font-medium">
                          {meta.join(' • ')}
                        </p>
                      )}
                      {job.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {job.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="font-mono text-[9px] px-2 py-0.5 rounded bg-surface-muted text-brand-muted font-semibold"
                            >
                              {tag}
                            </span>
                          ))}
                          {job.tags.length > 3 && (
                            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-surface-muted text-brand-muted font-semibold">
                              +{job.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-[var(--color-border)]/50 pt-3 sm:border-none sm:pt-0 shrink-0">
                    <span className="text-xs text-brand-muted flex items-center gap-1.5">
                      <Calendar className="size-3.5" aria-hidden="true" />
                      {date.label}
                    </span>
                    <ChevronRight className="size-5 text-brand-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
