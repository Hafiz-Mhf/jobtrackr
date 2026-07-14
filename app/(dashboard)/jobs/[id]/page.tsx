'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ExternalLink, Pencil, Trash2, FileText, Share2, Palette, Code, Terminal, Layers, Briefcase, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import { useJobs } from '@/hooks/useJobs'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { PrepPanel } from '@/components/prep/PrepPanel'
import { JobForm, type JobFormValues } from '@/components/jobs/JobForm'
import { JOB_STATUSES, STATUS_LABELS } from '@/lib/constants'
import { formatDate, cn } from '@/lib/utils'
import { stagger, fadeUp } from '@/lib/animations'
import { JobDetailSkeleton } from '@/components/ui/Skeleton'
import type { JobStatus } from '@/types'

function summaryPreview(description: string, company: string, role: string): string {
  const skip = new Set([company.trim().toLowerCase(), role.trim().toLowerCase()])
  const lines = description.split('\n')
  let i = 0
  while (i < lines.length && (lines[i].trim() === '' || skip.has(lines[i].trim().toLowerCase()))) i++
  return lines.slice(i).join('\n').trim() || description.trim()
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

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { jobs, loading, updateJob, updateJobStatus, deleteJob } = useJobs()
  const [editing, setEditing] = useState(false)
  const [showFullJd, setShowFullJd] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const router = useRouter()

  const job = jobs.find((j) => j.id === id)

  // Sync state notes when job loads
  useEffect(() => {
    if (job) {
      setNotes(job.notes || '')
    }
  }, [job])

  if (loading) return <JobDetailSkeleton />
  if (!job) return <div className="p-6 text-sm text-brand-muted">Job not found.</div>

  async function handleUpdate(values: JobFormValues) {
    await updateJob(id, values)
    setEditing(false)
  }

  async function handleDelete() {
    await deleteJob(id)
    router.push('/jobs')
  }

  async function handleNotesBlur() {
    if (notes.trim() === (job?.notes || '').trim()) return
    setSavingNotes(true)
    try {
      await updateJob(id, {
        company: job!.company,
        role: job!.role,
        notes: notes,
        status: job!.status,
        tags: job!.tags.join(', '),
        salary_range: job!.salary_range ?? '',
        location: job!.location ?? '',
        url: job!.url ?? '',
        applied_at: job!.applied_at ? job!.applied_at.slice(0, 10) : '',
        source: job!.source ?? '',
        rejection_reason: job!.rejection_reason ?? '',
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSavingNotes(false)
    }
  }

  if (editing) {
    return (
      <div className="p-6 max-w-2xl">
        <JobForm initial={job} onSubmit={handleUpdate} submitLabel="Save changes" />
      </div>
    )
  }

  const IconComponent = getJobIcon(job.role, job.tags)

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger(0.06)}
      className="p-6 max-w-max-content-width mx-auto flex flex-col gap-6"
    >
      {/* Top sticky navigation bar */}
      <motion.div variants={fadeUp} className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-8 h-8 rounded-full hover:bg-surface-muted transition-colors flex items-center justify-center text-brand-muted hover:text-accent"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="h-4 w-[1px] bg-[var(--color-border)]"></div>
          <span className="text-xs text-brand-muted font-medium">
            Applications / {job.company}
          </span>
        </div>
      </motion.div>

      {/* Page Header */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center border border-[var(--color-border)] shadow-sm shrink-0">
            <IconComponent className="size-8 text-accent" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="font-bold text-brand-text text-xl md:text-2xl">{job.role}</h2>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-sm md:text-base text-brand-muted">
              {job.company} &bull; {job.location || 'Remote'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-surface hover:bg-surface-muted transition-colors text-sm font-semibold text-brand-text flex items-center gap-2"
          >
            <Pencil className="size-4" />
            Edit details
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 rounded-lg border border-[var(--color-rejected)]/20 text-[var(--color-rejected)] bg-surface hover:bg-[var(--color-rejected)]/5 transition-colors text-sm font-semibold flex items-center gap-2"
          >
            <Trash2 className="size-4" />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <label htmlFor="quick-status" className="text-xs text-brand-muted font-semibold">
              Stage:
            </label>
            <select
              id="quick-status"
              value={job.status}
              onChange={(e) => {
                updateJobStatus(id, e.target.value as JobStatus).catch(() => {})
              }}
              className="border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-semibold bg-surface text-brand-text focus:ring-accent focus:border-accent"
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Main Grid Layout */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Role description and Notes */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* About the Role */}
          <section className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-brand-text text-lg">About the Role</h3>
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  View original posting
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              )}
            </div>

            {job.description ? (
              <div className="space-y-4">
                <p className={cn('text-sm leading-relaxed text-brand-text whitespace-pre-wrap', !showFullJd && 'line-clamp-6 text-brand-muted')}>
                  {showFullJd ? job.description : summaryPreview(job.description, job.company, job.role)}
                </p>
                <button
                  type="button"
                  onClick={() => setShowFullJd((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                >
                  {showFullJd ? 'Read less' : 'Read full description'}
                  <ChevronDown className={cn('size-3.5 transition-transform duration-200', showFullJd && 'rotate-180')} />
                </button>
              </div>
            ) : (
              <p className="text-sm text-brand-muted italic">No job description provided.</p>
            )}

            {job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-4 border-t border-[var(--color-border)]">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] px-2.5 py-1 rounded-md bg-accent-light text-accent font-semibold tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Direct Notes Textarea Card */}
          <section className="bg-surface border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-card">
            <div className="bg-surface-muted/30 px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center">
              <h3 className="font-bold text-brand-text text-base flex items-center gap-2">
                <FileText className="size-4 text-accent" />
                Private Notes
              </h3>
              <span className="text-[10px] md:text-xs text-brand-muted font-mono">
                {savingNotes ? 'Saving...' : 'Auto-saved on blur'}
              </span>
            </div>
            <div className="p-0">
              <textarea
                className="w-full h-64 p-6 bg-transparent border-none focus:ring-0 text-brand-text font-sans placeholder:text-text-muted resize-none leading-relaxed text-sm focus:outline-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Start typing your research, interview questions, or comments..."
              />
            </div>
          </section>
        </div>

        {/* Right Column: Prep panel and Point of Contact Metadata */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Recruiter / Metadata Card */}
          <section className="bg-surface border border-[var(--color-border)] rounded-2xl shadow-card p-6 space-y-4">
            <h4 className="text-sm font-bold text-brand-muted">Point of Contact</h4>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-accent-light flex items-center justify-center text-accent font-bold text-lg border border-[var(--color-border)]">
                {job.company.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h5 className="font-semibold text-brand-text text-sm">Recruitment Team</h5>
                <p className="text-xs text-brand-muted">{job.company}</p>
              </div>
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center text-brand-muted hover:text-accent transition-colors"
                  title="Original posting"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
            <div className="space-y-3 pt-3 border-t border-[var(--color-border)] text-xs">
              <div className="flex justify-between">
                <span className="text-brand-muted">Applied Date</span>
                <span className="text-brand-text font-medium">
                  {job.applied_at ? formatDate(job.applied_at) : 'Not recorded'}
                </span>
              </div>
              {job.source && (
                <div className="flex justify-between">
                  <span className="text-brand-muted">Source</span>
                  <span className="text-brand-text font-medium">{job.source}</span>
                </div>
              )}
              {job.salary_range && (
                <div className="flex justify-between">
                  <span className="text-brand-muted">Salary Range</span>
                  <span className="text-brand-text font-medium font-mono">{job.salary_range}</span>
                </div>
              )}
              {job.location && (
                <div className="flex justify-between">
                  <span className="text-brand-muted">Location</span>
                  <span className="text-brand-text font-medium">{job.location}</span>
                </div>
              )}
              {job.status === 'rejected' && job.rejection_reason && (
                <div className="flex justify-between text-[var(--color-rejected)]">
                  <span>Rejection Reason</span>
                  <span className="font-semibold">{job.rejection_reason}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-brand-muted">Last Updated</span>
                <span className="text-brand-text font-medium">{formatDate(job.last_updated)}</span>
              </div>
            </div>
          </section>

          {/* Interview Prep Questions */}
          <PrepPanel tags={job.tags} />
        </div>
      </motion.div>
    </motion.div>
  )
}
