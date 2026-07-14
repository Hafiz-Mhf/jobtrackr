'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BellOff, AlertTriangle, Briefcase, Trash2, BookOpen, CheckCircle2, Palette, Code, Terminal, Layers } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { useJobs } from '@/hooks/useJobs'
import { useReminders } from '@/hooks/useReminders'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { cn } from '@/lib/utils'

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

export default function RemindersPage() {
  const { jobs, loading, updateJobStatus } = useJobs()
  const { staleJobs } = useReminders(jobs)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  const activeReminders = staleJobs.filter((j) => !dismissedIds.includes(j.id))

  if (loading) return <div className="p-6 text-sm text-brand-muted">Loading...</div>

  return (
    <div className="p-6 max-w-max-content-width mx-auto flex flex-col gap-8">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-bold text-brand-text text-2xl md:text-3xl">Reminders</h2>
            {activeReminders.length > 0 && (
              <span className="bg-accent text-white px-3 py-0.5 rounded-full font-mono text-[10px] md:text-xs font-bold shadow-sm">
                {activeReminders.length} ACTIVE
              </span>
            )}
          </div>
          <p className="text-brand-muted text-sm md:text-base max-w-2xl leading-relaxed">
            Stay on top of your search. These applications haven&apos;t moved in 7 or more days. Reaching out for a follow-up can significantly increase your response rate.
          </p>
        </div>
      </div>

      {/* Reminders List */}
      {activeReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
          <div className="size-16 rounded-2xl bg-accent-light flex items-center justify-center mb-5">
            <BellOff className="size-7 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-brand-text">No stale applications</h2>
          <p className="text-sm text-brand-muted mt-1 max-w-xs leading-relaxed">
            Nice work staying on top of things — nothing has gone quiet for 7+ days.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeReminders.map((job) => {
            const days = differenceInDays(new Date(), new Date(job.last_updated))
            const IconComponent = getJobIcon(job.role, job.tags)

            return (
              <div
                key={job.id}
                className="relative overflow-hidden bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card transition-all duration-300 hover:shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-surface-muted rounded-xl flex items-center justify-center border border-[var(--color-border)] shrink-0 shadow-sm">
                    <IconComponent className="size-7 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-brand-text text-base md:text-lg">{job.company}</h3>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-sm font-semibold text-brand-muted">{job.role}</p>
                    {job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {job.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[9px] px-2 py-0.5 rounded bg-surface-muted text-brand-muted font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col md:items-end gap-3 shrink-0">
                  <div className="flex items-center gap-2 bg-amber-500/10 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-500/20 text-xs md:text-sm font-semibold leading-tight self-start md:self-auto">
                    <AlertTriangle className="size-4 animate-pulse" />
                    <span>No update in {days} days</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateJobStatus(job.id, 'interview')}
                      className="px-4 py-2 bg-surface hover:bg-surface-muted border border-accent text-accent font-semibold text-xs rounded-xl transition-all active:scale-[0.98] shadow-sm"
                    >
                      Update Status
                    </button>
                    <button
                      onClick={() => setDismissedIds((prev) => [...prev, job.id])}
                      className="p-2 text-brand-muted hover:text-[var(--color-rejected)] hover:bg-[var(--color-rejected)]/5 rounded-lg transition-all"
                      title="Dismiss Reminder"
                    >
                      <Trash2 className="size-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Advice Section (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="md:col-span-2 bg-accent/5 border border-accent/10 rounded-2xl p-6 md:p-8 flex items-center justify-between gap-8 overflow-hidden relative">
          <div className="relative z-10 space-y-4 max-w-xl">
            <h4 className="font-bold text-accent text-lg md:text-xl flex items-center gap-2">
              <BookOpen className="size-5" />
              Follow-up Masterclass
            </h4>
            <p className="text-brand-muted text-xs md:text-sm leading-relaxed">
              A polite nudge after 7 days shows genuine interest without being pushy. 80% of successful hires report following up at least once during the process.
            </p>
          </div>
          <div className="hidden lg:block relative shrink-0 opacity-10">
            <BookOpen className="size-36 text-accent" />
          </div>
        </div>

        <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 flex flex-col justify-between shadow-card gap-4">
          <div className="space-y-2">
            <span className="text-[var(--color-offer)] text-2xl font-bold">🎯</span>
            <h4 className="font-bold text-brand-text text-base">Weekly Goal</h4>
            <p className="text-brand-muted text-xs">Follow up with stale applications this week.</p>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-surface-muted h-2.5 rounded-full overflow-hidden">
              <div className="bg-[var(--color-offer)] h-full rounded-full transition-all" style={{ width: '60%' }}></div>
            </div>
            <div className="flex justify-between items-center text-[10px] md:text-xs text-brand-muted">
              <span>Goal: 5 follows</span>
              <span className="font-semibold text-[var(--color-offer)]">60% complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
