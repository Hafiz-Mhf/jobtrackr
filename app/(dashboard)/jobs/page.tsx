'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Briefcase, ChevronRight, Plus, Search, Calendar, MapPin, Palette, Code, Terminal, Layers } from 'lucide-react'
import { useJobs } from '@/hooks/useJobs'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types'

const STATUS_BAR_COLOR: Record<JobStatus, string> = {
  saved: 'bg-[var(--color-saved)]',
  applied: 'bg-[var(--color-applied)]',
  interview: 'bg-[var(--color-interview)]',
  offer: 'bg-[var(--color-offer)]',
  rejected: 'bg-[var(--color-rejected)]',
}

const STATUS_ICON_COLOR: Record<JobStatus, string> = {
  saved: 'text-[var(--color-saved)]',
  applied: 'text-[var(--color-applied)]',
  interview: 'text-[var(--color-interview)]',
  offer: 'text-[var(--color-offer)]',
  rejected: 'text-[var(--color-rejected)]',
}

function getJobIcon(role: string, tags: string[]) {
  const r = role.toLowerCase()
  const merged = [...tags.map((t) => t.toLowerCase()), r]
  if (merged.some((t) => t.includes('design') || t.includes('creative') || t.includes('figma') || t.includes('ui') || t.includes('ux') || t.includes('product'))) {
    return Palette
  }
  if (merged.some((t) => t.includes('frontend') || t.includes('react') || t.includes('web') || t.includes('next.js') || t.includes('typescript') || t.includes('javascript') || t.includes('html') || t.includes('css'))) {
    return Code
  }
  if (merged.some((t) => t.includes('backend') || t.includes('node') || t.includes('api') || t.includes('database') || t.includes('sql') || t.includes('python') || t.includes('go') || t.includes('terminal'))) {
    return Terminal
  }
  if (merged.some((t) => t.includes('architect') || t.includes('system') || t.includes('infra') || t.includes('devops') || t.includes('cloud') || t.includes('aws'))) {
    return Layers
  }
  return Briefcase
}

export default function JobsListPage() {
  const { jobs, loading, error } = useJobs()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  if (loading) return <div className="p-6 text-sm text-brand-muted">Loading jobs...</div>
  if (error) return <div className="p-6 text-sm text-[var(--color-rejected)]">{error}</div>

  // Filter logic
  const filteredJobs = jobs.filter((job) => {
    const matchSearch =
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.tags && job.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())))
    const matchStatus = selectedStatus === 'all' || job.status === selectedStatus
    return matchSearch && matchStatus
  })

  // Empty State (no jobs overall)
  if (jobs.length === 0) {
    return (
      <div className="p-6 max-w-max-content-width mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-2 text-brand-muted text-xs font-medium pb-4 border-b border-[var(--color-border)]">
          <span>Search</span>
          <span>&bull;</span>
          <span className="text-accent font-semibold">All Applications</span>
        </div>

        <div className="flex flex-col items-center justify-center text-center py-20 bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
          <div className="size-16 rounded-2xl bg-accent-light flex items-center justify-center mb-5 shadow-sm">
            <Briefcase className="size-7 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-brand-text">No applications yet</h2>
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
    <div className="p-6 max-w-max-content-width mx-auto flex flex-col gap-6">
      {/* Header and Breadcrumbs */}
      <div className="flex items-center gap-2 text-brand-muted text-xs font-medium pb-4 border-b border-[var(--color-border)]">
        <span>Search</span>
        <span>&bull;</span>
        <span className="text-accent font-semibold">All Applications</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-bold text-brand-text text-2xl md:text-3xl">All Applications</h2>
          <p className="text-brand-muted text-sm mt-1">
            Showing {filteredJobs.length} of {jobs.length} applications
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Plus className="size-4.5" />
          Add Job
        </Link>
      </div>

      {/* Search and Filters panel */}
      <div className="flex flex-col gap-4 bg-surface border border-[var(--color-border)] rounded-2xl p-4 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-brand-muted" />
          <input
            type="text"
            placeholder="Search by company, role, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm bg-surface text-brand-text focus:ring-4 focus:ring-accent/5 focus:border-accent focus:outline-none transition-all placeholder:text-brand-muted"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
          {statusFilterTabs.map((tab) => {
            const active = selectedStatus === tab.id
            const count = getStatusCount(tab.id)
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.97] cursor-pointer',
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
      </div>

      {/* Applications List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-brand-muted">No applications match your search filters.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
            const IconComponent = getJobIcon(job.role, job.tags)
            const meta = [job.location, job.salary_range].filter(Boolean).join(' &bull; ')

            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="relative overflow-hidden bg-surface border border-[var(--color-border)] rounded-2xl p-5 shadow-card card-hover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-surface-muted rounded-xl border border-[var(--color-border)] flex items-center justify-center shadow-sm shrink-0">
                    <IconComponent className={cn('size-6', STATUS_ICON_COLOR[job.status])} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-brand-text text-base leading-snug group-hover:text-accent transition-colors">
                      {job.role}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-brand-text text-sm">{job.company}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    {meta && (
                      <p
                        className="text-xs text-brand-muted font-medium flex items-center gap-1"
                        dangerouslySetInnerHTML={{ __html: meta }}
                      />
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
                  <span className="text-xs text-brand-muted font-mono flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Updated {formatDate(job.last_updated)}
                  </span>
                  <ChevronRight className="size-5 text-brand-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
