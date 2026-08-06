'use client'

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ChevronDown, ExternalLink, Pencil, Trash2, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { useJobs } from '@/hooks/useJobs'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { PrepPanel } from '@/components/prep/PrepPanel'
import { JobForm, type JobFormValues } from '@/components/jobs/JobForm'
import { RejectionModal } from '@/components/kanban/RejectionModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { JOB_STATUSES, STATUS_LABELS } from '@/lib/constants'
import { formatDate, cn } from '@/lib/utils'
import { JobIcon } from '@/components/jobs/JobIcon'
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

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { jobs, loading, updateJob, updateJobStatus, deleteJob } = useJobs()
  const [editing, setEditing] = useState(false)
  const [showFullJd, setShowFullJd] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pendingRejection, setPendingRejection] = useState(false)
  const router = useRouter()
  const reducedMotion = usePrefersReducedMotion()

  const job = jobs.find((j) => j.id === id)

  // Pull notes in only when a different job is shown. Keying this on `job`
  // resynced on every reference change — and JobsProvider replaces the array on
  // any status update, including this page's own Stage dropdown — which silently
  // overwrote whatever the user had typed but not yet blurred.
  const loadedNotesFor = useRef<string | null>(null)
  useEffect(() => {
    if (job && loadedNotesFor.current !== job.id) {
      loadedNotesFor.current = job.id
      setNotes(job.notes || '')
    }
  }, [job])

  if (loading) return <JobDetailSkeleton />
  if (!job) return <div className="p-6 text-sm text-brand-muted">Job not found.</div>

  async function handleUpdate(values: JobFormValues) {
    await updateJob(id, values)
    setEditing(false)
    toast.success('Changes saved')
  }

  async function handleDelete() {
    setConfirmingDelete(false)
    try {
      await deleteJob(id)
      toast.success('Application deleted')
      router.push('/jobs')
    } catch {
      // deleteJob restores the row and toasts on failure.
    }
  }

  function commitStatus(status: JobStatus, reason?: string) {
    updateJobStatus(id, status, reason).catch(() => {
      // useJobs reverts optimistic state + toasts on failure.
    })
  }

  // Moving to Rejected prompts for a reason — the same flow the Kanban board
  // uses. This dropdown used to write the status straight through, leaving a
  // rejected job with no reason recorded.
  function handleStatusSelect(next: JobStatus) {
    if (next === job?.status) return
    if (next === 'rejected') {
      setPendingRejection(true)
      return
    }
    commitStatus(next)
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
      console.error('[job-detail]', err)
      // Swallowing this left the user believing an autosave had landed.
      toast.error("Couldn't save your notes. Copy them somewhere safe and try again.", {
        duration: Infinity,
      })
    } finally {
      setSavingNotes(false)
    }
  }

  if (editing) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-bold text-brand-text text-lg">Edit application</h1>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="min-h-11 px-3 rounded-md text-sm font-semibold text-brand-muted hover:text-brand-text hover:bg-surface-muted transition-colors focus-ring cursor-pointer"
          >
            Cancel
          </button>
        </div>
        <JobForm initial={job} onSubmit={handleUpdate} submitLabel="Save changes" />
      </div>
    )
  }

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={stagger(0.06)}
      className="p-6 max-w-[var(--content-max)] mx-auto flex flex-col gap-6"
    >
      {/* Top sticky navigation bar */}
      <motion.div variants={fadeUp} className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="size-11 rounded-full hover:bg-surface-muted transition-colors flex items-center justify-center text-brand-muted hover:text-accent focus-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
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
          <div className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center shrink-0">
            <JobIcon role={job.role} tags={job.tags} className="size-8 text-accent" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="font-bold text-brand-text text-xl md:text-2xl">{job.role}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-sm md:text-base text-brand-muted">
              {job.company} &bull; {job.location || 'Remote'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="quick-status" className="text-xs text-brand-muted font-semibold">
              Stage:
            </label>
            <select
              id="quick-status"
              value={job.status}
              onChange={(e) => handleStatusSelect(e.target.value as JobStatus)}
              className="min-h-11 border border-[var(--color-border)] rounded-lg px-3 text-xs font-semibold bg-surface text-brand-text focus:border-accent focus-ring cursor-pointer"
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-h-11 px-4 rounded-lg border border-[var(--color-border)] bg-surface hover:bg-surface-muted transition-colors text-sm font-semibold text-brand-text flex items-center gap-2 focus-ring cursor-pointer"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit details
          </button>
          {/* Separated from Edit so the irreversible action isn't a mis-tap away. */}
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="min-h-11 ml-auto sm:ml-2 px-4 rounded-lg border border-[var(--color-error-text)]/25 text-[var(--color-error-text)] bg-surface hover:bg-[var(--color-error-text)]/5 transition-colors text-sm font-semibold flex items-center gap-2 focus-ring cursor-pointer"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </motion.div>

      {/* Main Grid Layout */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Role description and Notes */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* About the Role */}
          <section className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-brand-text text-lg">About the Role</h2>
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
                {/* Capped at ~70ch; this ran to ~88 characters per line at desktop width. */}
                <p className={cn('max-w-[68ch] text-sm leading-relaxed text-brand-text whitespace-pre-wrap', !showFullJd && 'line-clamp-6 text-brand-muted')}>
                  {showFullJd ? job.description : summaryPreview(job.description, job.company, job.role)}
                </p>
                <button
                  type="button"
                  onClick={() => setShowFullJd((v) => !v)}
                  aria-expanded={showFullJd}
                  className="inline-flex items-center gap-1 min-h-11 rounded-md px-1 text-xs font-semibold text-accent hover:underline focus-ring cursor-pointer"
                >
                  {showFullJd ? 'Read less' : 'Read full description'}
                  <ChevronDown
                    className={cn('size-3.5 transition-transform duration-200', showFullJd && 'rotate-180')}
                    aria-hidden="true"
                  />
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
              <h2 className="font-bold text-brand-text text-base flex items-center gap-2">
                <FileText className="size-4 text-accent" />
                Private Notes
              </h2>
              <span className="text-[10px] md:text-xs text-brand-muted font-mono">
                {savingNotes ? 'Saving...' : 'Auto-saved on blur'}
              </span>
            </div>
            <div className="p-0">
              <textarea
                id="job-notes"
                aria-label="Private notes about this application"
                className="w-full h-64 p-6 bg-transparent border-none text-brand-text font-sans placeholder:text-text-muted resize-none leading-relaxed text-sm focus-ring"
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
            {/* Was "Point of Contact" with a fabricated "Recruitment Team" and a
                letter avatar — the schema holds no contact fields, so the card
                implied a channel that doesn't exist. */}
            <h2 className="text-sm font-bold text-brand-muted">Application details</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center text-accent font-bold text-lg shrink-0">
                {job.company.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-brand-text text-sm truncate">{job.company}</p>
                <p className="text-xs text-brand-muted">{job.location || 'Location not recorded'}</p>
              </div>
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto shrink-0 inline-flex items-center justify-center size-11 rounded-lg bg-surface-muted text-brand-muted hover:text-accent transition-colors focus-ring"
                  aria-label="Open the original posting in a new tab"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
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
                <div className="flex justify-between text-[var(--color-error-text)]">
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

      <ConfirmDialog
        open={confirmingDelete}
        destructive
        title="Delete this application?"
        description={`${job.role} at ${job.company} will be removed permanently. This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />

      <RejectionModal
        open={pendingRejection}
        onSelect={(reason) => {
          commitStatus('rejected', reason)
          setPendingRejection(false)
        }}
        onSkip={() => {
          commitStatus('rejected', '')
          setPendingRejection(false)
        }}
        onCancel={() => setPendingRejection(false)}
      />
    </motion.div>
  )
}
