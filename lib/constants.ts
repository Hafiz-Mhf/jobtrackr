import type { JobStatus } from '@/types'

export const JOB_STATUSES: JobStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected']

export const STATUS_LABELS: Record<JobStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
}

export const KNOWN_TAGS = [
  'React', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
  'Node.js', 'Express', 'Python', 'Django', 'FastAPI',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase',
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD',
  'GraphQL', 'REST', 'Tailwind', 'CSS', 'HTML',
  'Git', 'Agile', 'Scrum', 'Figma', 'Remote',
] as const

export const STALE_DAYS = 7
export const MAX_FIELD_LENGTH = 200
export const MAX_TEXT_LENGTH = 10000
