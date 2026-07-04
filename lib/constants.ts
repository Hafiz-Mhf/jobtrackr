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

export const KNOWN_TAGS = [
  'React', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
  'Node.js', 'Express', 'Python', 'Django', 'FastAPI',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase', 'SQL',
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD',
  'GraphQL', 'REST', 'Tailwind', 'CSS', 'HTML',
  'Git', 'Agile', 'Scrum', 'Figma', 'Remote',
  // Non-engineering / business tooling & domains
  'Excel', 'SAP', 'Power BI', 'ServiceNow', 'Audit', 'Compliance',
  'ITAM', 'Jira', 'Tableau', 'VBA', 'SharePoint',
] as const

export const STALE_DAYS = 7
export const MAX_NAME_LENGTH = 100
export const MAX_FIELD_LENGTH = 200
export const MAX_TEXT_LENGTH = 10000
