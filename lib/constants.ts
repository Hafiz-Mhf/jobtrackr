import type { JobStatus } from '@/types'

export const JOB_STATUSES: JobStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected']

export const STATUS_LABELS: Record<JobStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

// Stage-specific prompt shown when a column is empty — more human than a repeated blank line.
export const STATUS_EMPTY_COPY: Record<JobStatus, string> = {
  saved: "Bookmark roles you're eyeing",
  applied: "Jobs you've sent off",
  interview: 'Where the conversations start',
  offer: 'The finish line — offers land here',
  rejected: 'Closed doors, lessons learned',
}

// Literal Tailwind classes (kept whole so JIT can see them) for each status accent.
export const STATUS_ACCENT: Record<JobStatus, { border: string; dot: string }> = {
  saved: { border: 'border-l-[color:var(--color-saved)]', dot: 'bg-[var(--color-saved)]' },
  applied: { border: 'border-l-[color:var(--color-applied)]', dot: 'bg-[var(--color-applied)]' },
  interview: { border: 'border-l-[color:var(--color-interview)]', dot: 'bg-[var(--color-interview)]' },
  offer: { border: 'border-l-[color:var(--color-offer)]', dot: 'bg-[var(--color-offer)]' },
  rejected: { border: 'border-l-[color:var(--color-rejected)]', dot: 'bg-[var(--color-rejected)]' },
}

export const STALE_DAYS = 7
export const MAX_NAME_LENGTH = 100
export const MAX_FIELD_LENGTH = 200
export const MAX_TEXT_LENGTH = 10000
export const MAX_TAGS = 50

// Application sources — Malaysian job portals plus discovery channels.
export const APPLICATION_SOURCES = [
  'LinkedIn', 'JobStreet', 'Hiredly', 'Ricebowl', 'Maukerja',
  'Indeed', 'Jobstore', 'Glassdoor', 'Referral', 'Recruiter',
  'Company website', 'Career fair', 'Other',
] as const

// Preset reasons captured when a job is moved to Rejected.
export const REJECTION_REASONS = [
  'No response', 'Not qualified', 'Withdrew', 'Offer declined',
] as const
