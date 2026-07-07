export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'

export interface Job {
  id: string
  user_id: string
  company: string
  role: string
  url?: string
  description?: string
  status: JobStatus
  salary_range?: string
  location?: string
  source?: string
  rejection_reason?: string
  rejected_at?: string
  tags: string[]
  notes?: string
  applied_at?: string
  last_updated: string
  created_at: string
}

export interface ParsedJob {
  company: string
  role: string
  salary_range?: string
  location?: string
  tags: string[]
  description: string
}

export interface InterviewQuestion {
  question: string
  category: 'technical' | 'behavioral' | 'company' | 'rolefit'
  tip: string
}

export interface Profile {
  id: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}
