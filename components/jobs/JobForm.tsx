'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { Job, JobStatus, ParsedJob } from '@/types'
import { JOB_STATUSES, STATUS_LABELS, APPLICATION_SOURCES, REJECTION_REASONS } from '@/lib/constants'
import { stagger, fadeUp } from '@/lib/animations'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useTags } from '@/contexts/TagsProvider'
import { cn } from '@/lib/utils'

interface WikidataEntity {
  id: string
  label: string
  description?: string
}

/** Shape of one `wbsearchentities` hit — only the fields this form reads. */
interface WikidataSearchHit {
  id?: string
  label?: string
  description?: string
}

// min-h-11 keeps every field on the 44px target baseline the rest of the app
// holds to. px-3/py-2 alone left these around 37px, and this is the form behind
// every job the user ever adds or edits. Textareas set their own height via
// rows, so the floor only ever raises the single-line controls.
const FIELD_CLASS =
  'w-full min-h-11 border border-[var(--color-border)] bg-surface rounded-md px-3 py-2 text-sm mt-1 focus:border-accent transition-colors focus-ring'

const INVALID_FIELD_CLASS = 'border-[var(--color-error-text)]'

// Company lookup is gated to deliberate queries so ordinary typing doesn't
// stream keystrokes to a third party. Shared by the effect and the dropdown.
const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 500

/** Marks a field the extractor filled in, so "review" means something. */
function ExtractedMark() {
  return (
    <span className="ml-1.5 align-middle text-[10px] font-mono font-semibold text-accent">
      auto
      <span className="sr-only"> — filled in automatically, check it</span>
    </span>
  )
}

export interface JobFormValues {
  company: string
  role: string
  url: string
  description: string
  status: JobStatus
  salary_range: string
  location: string
  tags: string
  notes: string
  applied_at: string
  source: string
  rejection_reason: string
}

interface Props {
  initial?: Partial<ParsedJob> | Partial<Job>
  onSubmit: (values: JobFormValues) => Promise<void>
  submitLabel?: string
  /** When true, fields fade + slide in with a staggered reveal (used after JD extraction). */
  reveal?: boolean
  /** Keys the extractor actually filled, so the form can say which is which. */
  prefilled?: Set<string>
}

function toDefaults(initial?: Partial<ParsedJob> | Partial<Job>): JobFormValues {
  return {
    company: initial?.company ?? '',
    role: initial?.role ?? '',
    url: 'url' in (initial ?? {}) ? (initial as Partial<Job>).url ?? '' : '',
    description: initial?.description ?? '',
    status: 'status' in (initial ?? {}) ? (initial as Partial<Job>).status ?? 'saved' : 'saved',
    salary_range: initial?.salary_range ?? '',
    location: initial?.location ?? '',
    tags: (initial?.tags ?? []).join(', '),
    notes: 'notes' in (initial ?? {}) ? (initial as Partial<Job>).notes ?? '' : '',
    // <input type="date"> needs YYYY-MM-DD; applied_at is stored as an ISO timestamp.
    applied_at: 'applied_at' in (initial ?? {}) ? ((initial as Partial<Job>).applied_at ?? '').slice(0, 10) : '',
    source: 'source' in (initial ?? {}) ? (initial as Partial<Job>).source ?? '' : '',
    rejection_reason: 'rejection_reason' in (initial ?? {}) ? (initial as Partial<Job>).rejection_reason ?? '' : '',
  }
}

export function JobForm({
  initial,
  onSubmit,
  submitLabel = 'Save job',
  reveal = false,
  prefilled,
}: Props) {
  const [values, setValues] = useState<JobFormValues>(toDefaults(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ company?: string; role?: string }>({})
  const { addLocal } = useTags()
  const reducedMotion = usePrefersReducedMotion()

  const companyRef = useRef<HTMLInputElement>(null)
  const roleRef = useRef<HTMLInputElement>(null)

  // Wikidata suggestions state — see MIN_QUERY_LENGTH / DEBOUNCE_MS above.
  const [suggestions, setSuggestions] = useState<WikidataEntity[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  // Single source of truth for "is the listbox actually open", so the rendered
  // list, aria-expanded and the arrow-key handler can't disagree.
  const suggestionsOpen =
    showSuggestions &&
    suggestions.length > 0 &&
    values.company.trim().length >= MIN_QUERY_LENGTH
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  function set<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (key === 'company' || key === 'role') {
      // Clear the field's error as soon as the user starts fixing it.
      setFieldErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  // Company-name suggestions from Wikidata.
  //
  // NOTE: this sends what the user types in Company to a third party. It is
  // gated to deliberate queries — at least MIN_QUERY_LENGTH characters, after
  // DEBOUNCE_MS of inactivity — so ordinary typing does not stream keystrokes
  // off-device, and it is skipped entirely while offline. Whether to disclose
  // the lookup in the UI or drop it altogether is still an open product call.
  useEffect(() => {
    const query = values.company.trim()
    const controller = new AbortController()

    // The "too short / offline" reset happens inside the timeout rather than in
    // the effect body: clearing synchronously here is a cascading render, and
    // the dropdown is gated on MIN_QUERY_LENGTH anyway, so nothing stale shows.
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < MIN_QUERY_LENGTH || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        setSuggestions([])
        return
      }
      try {
        const response = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&format=json&origin=*`,
          { signal: controller.signal }
        )
        if (response.ok) {
          const data: unknown = await response.json()
          const search = (data as { search?: unknown })?.search
          if (Array.isArray(search)) {
            const rawItems: WikidataEntity[] = (search as WikidataSearchHit[])
              .filter((item) => Boolean(item?.id && item?.label))
              .map((item) => ({
                id: item.id as string,
                label: item.label as string,
                description: item.description,
              }))

            // Prioritize results that look like companies, businesses, brands, or organizations
            const prioritized = [...rawItems].sort((a, b) => {
              const aDesc = (a.description || '').toLowerCase()
              const bDesc = (b.description || '').toLowerCase()
              const isAOrg = /company|corporation|business|enterprise|brand|firm|organization|multinational|startup/i.test(aDesc)
              const isBOrg = /company|corporation|business|enterprise|brand|firm|organization|multinational|startup/i.test(bDesc)
              if (isAOrg && !isBOrg) return -1
              if (!isAOrg && isBOrg) return 1
              return 0
            })

            setSuggestions(prioritized.slice(0, 5))
          }
        }
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setSuggestions([])
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(delayDebounceFn)
      controller.abort()
    }
  }, [values.company])

  // Handle click outside to close suggestions list
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelectSuggestion(suggestion: WikidataEntity) {
    setValues((v) => ({
      ...v,
      company: suggestion.label,
    }))
    setFieldErrors((e) => ({ ...e, company: undefined }))
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestion(-1)
  }

  // Arrow keys move through suggestions, Enter picks, Escape dismisses — without
  // this the list is a set of buttons wedged between Company and Role in the tab
  // order, which is why they are now taken out of it (tabIndex -1).
  function handleCompanyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestionsOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault()
      handleSelectSuggestion(suggestions[activeSuggestion])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveSuggestion(-1)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const nextErrors: { company?: string; role?: string } = {}
    if (!values.company.trim()) nextErrors.company = 'Add the company name.'
    if (!values.role.trim()) nextErrors.role = 'Add the role title.'

    if (nextErrors.company || nextErrors.role) {
      setFieldErrors(nextErrors)
      setError(null)
      // Send focus to the first problem rather than leaving the user to hunt.
      ;(nextErrors.company ? companyRef : roleRef).current?.focus()
      return
    }

    setFieldErrors({})
    setError(null)
    setSaving(true)
    try {
      await onSubmit(values)
      addLocal(values.tags.split(',').map((t) => t.trim()).filter(Boolean))
    } catch (err) {
      // The provider hands up the route's own copy, which names the actual
      // problem ("Description is too long."). Collapsing every failure into one
      // generic line left the user with nothing to act on.
      setError(err instanceof Error ? err.message : 'Could not save job. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      variants={stagger(0.07)}
      // Framer drives these through the Web Animations API, which the global
      // reduced-motion CSS rule cannot reach — opt out here.
      initial={reveal && !reducedMotion ? 'hidden' : false}
      animate="visible"
    >
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative" ref={suggestionsRef}>
          <label htmlFor="job-company" className="text-sm font-medium">
            Company *
            {prefilled?.has('company') && <ExtractedMark />}
          </label>
          <input
            id="job-company"
            ref={companyRef}
            value={values.company}
            onChange={(e) => {
              set('company', e.target.value)
              setShowSuggestions(true)
              setActiveSuggestion(-1)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleCompanyKeyDown}
            role="combobox"
            aria-expanded={suggestionsOpen}
            aria-controls="company-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={
              activeSuggestion >= 0 ? `company-suggestion-${activeSuggestion}` : undefined
            }
            aria-required="true"
            aria-invalid={fieldErrors.company ? true : undefined}
            aria-describedby={fieldErrors.company ? 'job-company-error' : undefined}
            className={cn(FIELD_CLASS, fieldErrors.company && INVALID_FIELD_CLASS)}
            autoComplete="off"
          />
          {fieldErrors.company && (
            <p id="job-company-error" className="mt-1 text-xs text-[var(--color-error-text)]">
              {fieldErrors.company}
            </p>
          )}
          {prefilled && !prefilled.has('company') && !fieldErrors.company && (
            <p className="mt-1 text-xs text-brand-muted">Not found — add it.</p>
          )}

          {suggestionsOpen && (
            <ul
              id="company-suggestions"
              role="listbox"
              aria-label="Company suggestions"
              className="absolute left-0 right-0 mt-1 bg-surface border border-[var(--color-border)] rounded-xl shadow-lg max-h-56 overflow-y-auto z-50"
            >
              {suggestions.map((s, i) => (
                <li key={s.id} role="none">
                  <button
                    id={`company-suggestion-${i}`}
                    role="option"
                    aria-selected={i === activeSuggestion}
                    // Out of the tab order: the input owns keyboard access via
                    // arrow keys, so Tab goes straight from Company to Role.
                    tabIndex={-1}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    onMouseEnter={() => setActiveSuggestion(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer border-b last:border-b-0 border-[var(--color-border)]/50',
                      i === activeSuggestion ? 'bg-surface-muted' : 'hover:bg-surface-muted'
                    )}
                  >
                    <div className="size-6 rounded bg-accent-light text-accent flex items-center justify-center text-xs font-bold shrink-0">
                      {s.label.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-brand-text truncate leading-snug">{s.label}</p>
                      {s.description && (
                        <p className="text-[10px] text-brand-muted truncate mt-0.5">{s.description}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label htmlFor="job-role" className="text-sm font-medium">
            Role *
            {prefilled?.has('role') && <ExtractedMark />}
          </label>
          <input
            id="job-role"
            ref={roleRef}
            value={values.role}
            onChange={(e) => set('role', e.target.value)}
            aria-required="true"
            aria-invalid={fieldErrors.role ? true : undefined}
            aria-describedby={fieldErrors.role ? 'job-role-error' : undefined}
            className={cn(FIELD_CLASS, fieldErrors.role && INVALID_FIELD_CLASS)}
          />
          {fieldErrors.role && (
            <p id="job-role-error" className="mt-1 text-xs text-[var(--color-error-text)]">
              {fieldErrors.role}
            </p>
          )}
          {prefilled && !prefilled.has('role') && !fieldErrors.role && (
            <p className="mt-1 text-xs text-brand-muted">Not found — add it.</p>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="job-salary" className="text-sm font-medium">
            Salary range
            {prefilled?.has('salary_range') && <ExtractedMark />}
          </label>
          <input
            id="job-salary"
            value={values.salary_range}
            onChange={(e) => set('salary_range', e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="job-location" className="text-sm font-medium">
            Location
            {prefilled?.has('location') && <ExtractedMark />}
          </label>
          <input
            id="job-location"
            value={values.location}
            onChange={(e) => set('location', e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="job-applied-at" className="text-sm font-medium">Applied on</label>
          <input
            id="job-applied-at"
            type="date"
            value={values.applied_at}
            onChange={(e) => set('applied_at', e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="job-source" className="text-sm font-medium">Source</label>
          <select
            id="job-source"
            value={values.source}
            onChange={(e) => set('source', e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Not set</option>
            {APPLICATION_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <label htmlFor="job-url" className="text-sm font-medium">
          Job URL
          {prefilled?.has('url') && <ExtractedMark />}
        </label>
        <input
          id="job-url"
          value={values.url}
          onChange={(e) => set('url', e.target.value)}
          className={FIELD_CLASS}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <label htmlFor="job-tags" className="text-sm font-medium">
          Tags (comma-separated)
          {prefilled?.has('tags') && <ExtractedMark />}
        </label>
        <input
          id="job-tags"
          value={values.tags}
          onChange={(e) => set('tags', e.target.value)}
          className={cn(FIELD_CLASS, 'font-mono')}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <label htmlFor="job-status" className="text-sm font-medium">Status</label>
        <select
          id="job-status"
          value={values.status}
          onChange={(e) => set('status', e.target.value as JobStatus)}
          className={FIELD_CLASS}
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </motion.div>

      {values.status === 'rejected' && (
        <motion.div variants={fadeUp}>
          <label htmlFor="job-rejection-reason" className="text-sm font-medium">Rejection reason</label>
          <select
            id="job-rejection-reason"
            value={values.rejection_reason}
            onChange={(e) => set('rejection_reason', e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Not set</option>
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <label htmlFor="job-description" className="text-sm font-medium">Description</label>
        <textarea
          id="job-description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          className={FIELD_CLASS}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <label htmlFor="job-notes" className="text-sm font-medium">Notes</label>
        <textarea
          id="job-notes"
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          className={FIELD_CLASS}
        />
      </motion.div>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error-text)]">
          {error}
        </p>
      )}

      <motion.div variants={fadeUp}>
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-colors disabled:bg-surface-muted disabled:text-brand-muted focus-ring cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
      </motion.div>
    </motion.form>
  )
}
