'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { ParseInput } from '@/components/jobs/ParseInput'
import { JobForm, type JobFormValues } from '@/components/jobs/JobForm'
import { useJobs } from '@/hooks/useJobs'
import type { ParsedJobWithUrl } from '@/hooks/useParser'
import type { JobStatus } from '@/types'

function NewJobFormContent() {
  const searchParams = useSearchParams()
  const defaultStatus = searchParams.get('status') as JobStatus | null
  const [parsed, setParsed] = useState<ParsedJobWithUrl | null>(null)
  const [showForm, setShowForm] = useState(defaultStatus !== null)
  const { jobs, createJob } = useJobs()
  const router = useRouter()

  async function handleSubmit(values: JobFormValues) {
    const job = await createJob(values)
    router.push(`/jobs/${job.id}`)
  }

  const recentJobs = jobs.slice(0, 3)

  return (
    <div className="p-6 max-w-max-content-width mx-auto flex flex-col gap-6">
      {/* Context Title Header */}
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h3 className="font-bold text-brand-text text-2xl md:text-3xl mb-3">Where&apos;s your next move?</h3>
        <p className="text-brand-muted text-sm md:text-base leading-relaxed">
          Drop the job description below. Our AI will automatically extract the company, role, requirements, and key deadlines for you.
        </p>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Area: Paste JD or Review Form */}
        <div className="lg:col-span-8">
          {!showForm ? (
            <ParseInput
              onParsed={(p) => {
                setParsed(p)
                setShowForm(true)
              }}
              onManual={() => setShowForm(true)}
            />
          ) : (
            <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 md:p-8 shadow-card">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-border)]">
                <h4 className="font-bold text-brand-text text-base md:text-lg">Review Extracted Details</h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Back to description
                </button>
              </div>
              <JobForm
                initial={parsed ?? (defaultStatus ? { status: defaultStatus } : undefined)}
                onSubmit={handleSubmit}
                submitLabel="Save application"
                reveal={parsed !== null}
              />
            </div>
          )}
        </div>

        {/* Bento Sidebar: Tips and Recent items */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Tips */}
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card space-y-4">
            <h4 className="font-bold text-brand-text text-base">Quick Tips</h4>
            <ul className="space-y-4">
              <li className="flex gap-3 text-xs md:text-sm text-brand-text leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-[var(--color-applied)]/10 text-[var(--color-applied)] flex items-center justify-center shrink-0 font-bold text-xs">✓</span>
                <span>Include the &quot;About the Company&quot; section for better cultural match analysis.</span>
              </li>
              <li className="flex gap-3 text-xs md:text-sm text-brand-text leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-[var(--color-interview)]/10 text-[var(--color-interview)] flex items-center justify-center shrink-0 font-bold text-xs">✓</span>
                <span>Don&apos;t worry about formatting; JobTrackr cleans up HTML and extra whitespace.</span>
              </li>
              <li className="flex gap-3 text-xs md:text-sm text-brand-text leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-[var(--color-offer)]/10 text-[var(--color-offer)] flex items-center justify-center shrink-0 font-bold text-xs">✓</span>
                <span>We automatically detect tech stacks to customize your prep dashboard.</span>
              </li>
            </ul>
          </div>

          {/* Dynamic Recent List */}
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card space-y-4">
            <h4 className="text-sm font-bold text-brand-muted">Recently Added</h4>
            {recentJobs.length === 0 ? (
              <p className="text-xs text-brand-muted italic py-2">No applications added yet.</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/jobs/${j.id}`}
                    className="flex items-center gap-3 bg-surface-muted/30 border border-[var(--color-border)] rounded-xl p-3 hover:border-accent transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                      <Briefcase className="size-4.5 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs md:text-sm text-brand-text truncate leading-tight">{j.role}</p>
                      <p className="text-[10px] md:text-xs text-brand-muted truncate mt-0.5">{j.company}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-brand-muted">Loading page...</div>}>
      <NewJobFormContent />
    </Suspense>
  )
}
