'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, ChevronDown } from 'lucide-react'
import { ParseInput } from '@/components/jobs/ParseInput'
import { JobForm, type JobFormValues } from '@/components/jobs/JobForm'
import { useJobs } from '@/hooks/useJobs'
import type { ParsedJobWithUrl } from '@/hooks/useParser'
import type { JobStatus } from '@/types'
import { cn } from '@/lib/utils'

/** Which of the extracted fields actually came back with a value. */
function prefilledKeys(parsed: ParsedJobWithUrl | null): Set<string> {
  if (!parsed) return new Set()
  const filled = new Set<string>()
  for (const key of ['company', 'role', 'salary_range', 'location', 'url', 'description'] as const) {
    if (parsed[key]) filled.add(key)
  }
  if (parsed.tags.length > 0) filled.add('tags')
  return filled
}

function NewJobFormContent() {
  const searchParams = useSearchParams()
  const defaultStatus = searchParams.get('status') as JobStatus | null
  const [parsed, setParsed] = useState<ParsedJobWithUrl | null>(null)
  const [showForm, setShowForm] = useState(defaultStatus !== null)
  // The pasted source lives here, not inside ParseInput: switching to the review
  // form unmounts that component, and the text used to be destroyed with it —
  // exactly when the user needs it to check what was extracted.
  const [sourceText, setSourceText] = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)
  const { jobs, createJob } = useJobs()
  const router = useRouter()

  async function handleSubmit(values: JobFormValues) {
    const job = await createJob(values)
    router.push(`/jobs/${job.id}`)
  }

  const recentJobs = jobs.slice(0, 3)
  const prefilled = prefilledKeys(parsed)
  // A URL fetch that failed comes back with only `url` set. Promising a review
  // of extracted details over an empty form is the worst moment on this page.
  const extractionFound = prefilled.size > 0 && (prefilled.size > 1 || !prefilled.has('url'))

  return (
    <div className="p-6 max-w-[var(--content-max)] mx-auto flex flex-col gap-6">
      {/* Context Title Header */}
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="font-bold text-brand-text text-2xl md:text-3xl mb-3">Where&apos;s your next move?</h1>
        <p className="text-brand-muted text-sm md:text-base leading-relaxed">
          Paste the job description or a link. JobTrackr pulls out the company, role,
          salary, location, and tech tags — check them before saving.
        </p>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Area: Paste JD or Review Form */}
        <div className="lg:col-span-8">
          {!showForm ? (
            <ParseInput
              text={sourceText}
              onTextChange={setSourceText}
              onParsed={(p) => {
                setParsed(p)
                setShowForm(true)
              }}
              onManual={() => setShowForm(true)}
            />
          ) : (
            <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 md:p-8 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-4 border-b border-[var(--color-border)]">
                <h2 className="font-bold text-brand-text text-base md:text-lg">
                  {extractionFound ? 'Review extracted details' : 'Add the details'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-semibold text-accent hover:underline focus-ring cursor-pointer"
                >
                  Back to description
                </button>
              </div>

              {!extractionFound && (
                <p className="mb-5 text-sm text-brand-muted leading-relaxed">
                  Nothing could be read automatically — fill the fields in below.
                </p>
              )}

              {sourceText.trim() && (
                // Kept beside the form so checking a value never costs the paste.
                <div className="mb-5 border border-[var(--color-border)] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSourceOpen((o) => !o)}
                    aria-expanded={sourceOpen}
                    aria-controls="source-text-panel"
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-brand-text bg-surface-muted/50 hover:bg-surface-muted transition-colors focus-ring cursor-pointer"
                  >
                    What you pasted
                    <ChevronDown
                      className={cn('size-4 text-brand-muted transition-transform', sourceOpen && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>
                  {sourceOpen && (
                    <p
                      id="source-text-panel"
                      className="max-h-56 overflow-y-auto px-4 py-3 text-xs text-brand-muted leading-relaxed whitespace-pre-wrap"
                    >
                      {sourceText}
                    </p>
                  )}
                </div>
              )}

              <JobForm
                initial={parsed ?? (defaultStatus ? { status: defaultStatus } : undefined)}
                onSubmit={handleSubmit}
                submitLabel="Save application"
                reveal={parsed !== null}
                prefilled={prefilled}
              />
            </div>
          )}
        </div>

        {/* Bento Sidebar: Tips and Recent items */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Tips */}
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="font-bold text-brand-text text-base">Quick Tips</h2>
            <ul className="space-y-4">
              <li className="flex gap-3 text-xs md:text-sm text-brand-text leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-[var(--color-applied)]/10 text-[var(--color-applied)] flex items-center justify-center shrink-0 font-bold text-xs">✓</span>
                <span>Paste the whole posting — the more text, the better the tags.</span>
              </li>
              <li className="flex gap-3 text-xs md:text-sm text-brand-text leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-[var(--color-interview)]/10 text-[var(--color-interview)] flex items-center justify-center shrink-0 font-bold text-xs">✓</span>
                <span>Pasting a link works too — JobTrackr reads the page and strips the HTML.</span>
              </li>
              <li className="flex gap-3 text-xs md:text-sm text-brand-text leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-[var(--color-offer)]/10 text-[var(--color-offer)] flex items-center justify-center shrink-0 font-bold text-xs">✓</span>
                <span>Detected tech tags pick the interview prep questions on the job page.</span>
              </li>
            </ul>
          </div>

          {/* Dynamic Recent List */}
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="text-sm font-bold text-brand-muted">Recently Added</h2>
            {recentJobs.length === 0 ? (
              <p className="text-xs text-brand-muted italic py-2">No applications added yet.</p>
            ) : (
              // Rows, not cards — these sit inside a card already.
              <div className="-mx-2">
                {recentJobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/jobs/${j.id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-muted/60 transition-colors focus-ring"
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
                      <Briefcase className="size-4.5 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs md:text-sm text-brand-text truncate leading-snug">{j.role}</p>
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
