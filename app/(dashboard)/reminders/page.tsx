'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BellOff, AlertTriangle, EyeOff, BookOpen, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useJobs } from '@/hooks/useJobs'
import { useReminders } from '@/hooks/useReminders'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { JobIcon } from '@/components/jobs/JobIcon'
import { RejectionModal } from '@/components/kanban/RejectionModal'
import { RemindersSkeleton } from '@/components/ui/Skeleton'
import { getStaleDays } from '@/lib/reminders'
import { JOB_STATUSES, STATUS_LABELS, STALE_THRESHOLDS } from '@/lib/constants'
import type { Job, JobStatus } from '@/types'

export default function RemindersPage() {
  const { jobs, loading, updateJobStatus } = useJobs()
  const { staleJobs } = useReminders(jobs)
  // Hiding is deliberately session-only — see hideReminder, which says so in
  // the toast rather than letting a trash-can icon imply a permanent delete.
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [pendingRejection, setPendingRejection] = useState<string | null>(null)

  const activeReminders = staleJobs.filter((j) => !hiddenIds.includes(j.id))
  const longestWait = activeReminders.reduce((max, j) => Math.max(max, getStaleDays(j)), 0)

  function commitStatus(jobId: string, status: JobStatus, reason?: string) {
    updateJobStatus(jobId, status, reason).catch(() => {
      // useJobs reverts the optimistic update and toasts on failure.
    })
  }

  // Mirrors the job detail page: moving to Rejected collects a reason first
  // instead of writing the status straight through.
  function handleStatusSelect(job: Job, next: JobStatus) {
    if (next === job.status) return
    if (next === 'rejected') {
      setPendingRejection(job.id)
      return
    }
    commitStatus(job.id, next)
  }

  function hideReminder(job: Job) {
    setHiddenIds((prev) => [...prev, job.id])
    toast(`${job.company} hidden for now`, {
      description: 'It comes back next time you open this page.',
      action: {
        label: 'Undo',
        onClick: () => setHiddenIds((prev) => prev.filter((id) => id !== job.id)),
      },
    })
  }

  if (loading) return <RemindersSkeleton />

  return (
    <div className="p-6 max-w-[var(--content-max)] mx-auto flex flex-col gap-8">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-bold text-brand-text text-2xl md:text-3xl">Reminders</h1>
            {activeReminders.length > 0 && (
              <span className="bg-accent text-white px-3 py-0.5 rounded-full font-mono text-[10px] md:text-xs font-bold shadow-sm">
                {activeReminders.length} ACTIVE
              </span>
            )}
          </div>
          <p className="text-brand-muted text-sm md:text-base max-w-2xl leading-relaxed">
            Stay on top of your search. These have gone quiet long enough to be worth a nudge —{' '}
            {/* One template literal rather than interpolations woven through JSX
                text: a text node that both follows an expression and wraps onto
                a new line gets its first line trimmed, which silently ate the
                space in "14 once you're interviewing". */}
            {`${STALE_THRESHOLDS.applied} days after applying, ${STALE_THRESHOLDS.interview} once you're interviewing, ${STALE_THRESHOLDS.offer} on an open offer.`}{' '}
            Reaching out can significantly increase your response rate.
          </p>
        </div>
      </div>

      {/* Screen readers get told when a card leaves the list — the removal is
          otherwise silent. */}
      <p aria-live="polite" className="sr-only">
        {activeReminders.length} application{activeReminders.length === 1 ? '' : 's'} needing
        follow-up.
      </p>

      {/* Reminders List */}
      {activeReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
          <div className="size-16 rounded-2xl bg-accent-light flex items-center justify-center mb-5">
            <BellOff className="size-7 text-accent" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-brand-text">No stale applications</h2>
          <p className="text-sm text-brand-muted mt-1 max-w-xs leading-relaxed">
            Nice work staying on top of things — nothing has gone quiet long enough to chase.
          </p>
        </div>
      ) : (
        <section className="grid gap-4">
          <h2 className="sr-only">Applications waiting on a follow-up</h2>
          {activeReminders.map((job) => {
            // Counted from the same field getStaleJobs filters on, so the badge
            // can't contradict the reason the card is on this page.
            const days = getStaleDays(job)

            return (
              <div
                key={job.id}
                className="relative overflow-hidden bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-surface-muted rounded-xl flex items-center justify-center shrink-0">
                    <JobIcon role={job.role} tags={job.tags} className="size-7 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-brand-text text-base md:text-lg">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="hover:text-accent transition-colors focus-ring rounded-sm"
                        >
                          {job.company}
                        </Link>
                      </h3>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-sm font-semibold text-brand-muted">{job.role}</p>
                    {job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.tags.slice(0, 3).map((tag) => (
                          <span
                            key={`${job.id}-${tag}`}
                            className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-muted text-brand-muted font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col md:items-end gap-3 shrink-0">
                  {/* Tinted fill, no border — matches StatusBadge, and a
                      bordered box inside the card read as a second card. */}
                  <div className="flex items-center gap-2 bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold leading-tight self-start md:self-auto">
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    <span>
                      No update in {days} day{days === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* A picker, not a button: the old "Update Status" control
                        force-wrote 'interview' on every job with no way to see
                        where it was sending them. */}
                    <label htmlFor={`status-${job.id}`} className="sr-only">
                      Move {job.role} at {job.company} to a different stage
                    </label>
                    <select
                      id={`status-${job.id}`}
                      value={job.status}
                      onChange={(e) => handleStatusSelect(job, e.target.value as JobStatus)}
                      className="min-h-11 border border-[var(--color-border)] rounded-xl px-3 text-xs font-semibold bg-surface text-brand-text focus:border-accent focus-ring cursor-pointer"
                    >
                      {JOB_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => hideReminder(job)}
                      aria-label={`Hide the reminder for ${job.role} at ${job.company}`}
                      className="min-h-11 min-w-11 flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-surface-muted rounded-lg transition-colors focus-ring cursor-pointer"
                    >
                      <EyeOff className="size-4.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Advice Section (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <section
          className={`${activeReminders.length > 0 ? 'md:col-span-2' : 'md:col-span-3'} bg-accent/5 border border-accent/10 rounded-2xl p-6 md:p-8 flex items-center justify-between gap-8 overflow-hidden relative`}
        >
          <div className="relative z-10 space-y-4 max-w-xl">
            <h2 className="font-bold text-accent text-lg md:text-xl flex items-center gap-2">
              <BookOpen className="size-5" aria-hidden="true" />
              Follow-up Masterclass
            </h2>
            <p className="text-brand-muted text-xs md:text-sm leading-relaxed">
              A polite nudge after a week or two shows genuine interest without being pushy. Keep
              it short, restate what drew you to the role, and ask about next steps.
            </p>
          </div>
          <div className="hidden lg:block relative shrink-0 opacity-10" aria-hidden="true">
            <BookOpen className="size-36 text-accent" />
          </div>
        </section>

        {/* Real counts from the list above. This tile used to render a
            hardcoded "60% complete" progress bar against an invented goal. */}
        {activeReminders.length > 0 && (
          <section className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 flex flex-col justify-between shadow-card gap-4">
            <div className="space-y-2">
              <Clock className="size-6 text-accent" aria-hidden="true" />
              <h2 className="font-bold text-brand-text text-base">Where things stand</h2>
            </div>
            <dl className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-brand-muted">Waiting on a reply</dt>
                <dd className="font-mono font-bold text-brand-text">{activeReminders.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-brand-muted">Longest silence</dt>
                <dd className="font-mono font-bold text-[var(--color-warning-text)]">
                  {longestWait} day{longestWait === 1 ? '' : 's'}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      <RejectionModal
        open={pendingRejection !== null}
        onSelect={(reason) => {
          if (pendingRejection) commitStatus(pendingRejection, 'rejected', reason)
          setPendingRejection(null)
        }}
        onSkip={() => {
          if (pendingRejection) commitStatus(pendingRejection, 'rejected', '')
          setPendingRejection(null)
        }}
        onCancel={() => setPendingRejection(null)}
      />
    </div>
  )
}
