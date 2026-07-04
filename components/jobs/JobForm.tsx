'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Job, JobStatus, ParsedJob } from '@/types'
import { JOB_STATUSES, STATUS_LABELS } from '@/lib/constants'
import { stagger, fadeUp } from '@/lib/animations'

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
}

interface Props {
  initial?: Partial<ParsedJob> | Job
  onSubmit: (values: JobFormValues) => Promise<void>
  submitLabel?: string
  /** When true, fields fade + slide in with a staggered reveal (used after JD extraction). */
  reveal?: boolean
}

function toDefaults(initial?: Partial<ParsedJob> | Job): JobFormValues {
  return {
    company: initial?.company ?? '',
    role: initial?.role ?? '',
    url: 'url' in (initial ?? {}) ? (initial as Job).url ?? '' : '',
    description: initial?.description ?? '',
    status: 'status' in (initial ?? {}) ? (initial as Job).status : 'saved',
    salary_range: initial?.salary_range ?? '',
    location: initial?.location ?? '',
    tags: (initial?.tags ?? []).join(', '),
    notes: 'notes' in (initial ?? {}) ? (initial as Job).notes ?? '' : '',
  }
}

export function JobForm({ initial, onSubmit, submitLabel = 'Save job', reveal = false }: Props) {
  const [values, setValues] = useState<JobFormValues>(toDefaults(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.company.trim() || !values.role.trim()) {
      setError('Company and role are required.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit(values)
    } catch {
      setError('Could not save job. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      variants={stagger(0.07)}
      initial={reveal ? 'hidden' : false}
      animate="visible"
    >
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="job-company" className="text-sm font-medium">Company *</label>
          <input
            id="job-company"
            value={values.company}
            onChange={(e) => set('company', e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label htmlFor="job-role" className="text-sm font-medium">Role *</label>
          <input
            id="job-role"
            value={values.role}
            onChange={(e) => set('role', e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="job-salary" className="text-sm font-medium">Salary range</label>
          <input
            id="job-salary"
            value={values.salary_range}
            onChange={(e) => set('salary_range', e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label htmlFor="job-location" className="text-sm font-medium">Location</label>
          <input
            id="job-location"
            value={values.location}
            onChange={(e) => set('location', e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <label htmlFor="job-url" className="text-sm font-medium">Job URL</label>
        <input
          id="job-url"
          value={values.url}
          onChange={(e) => set('url', e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <label htmlFor="job-tags" className="text-sm font-medium">Tags (comma-separated)</label>
        <input
          id="job-tags"
          value={values.tags}
          onChange={(e) => set('tags', e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1 font-mono"
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <label htmlFor="job-status" className="text-sm font-medium">Status</label>
        <select
          id="job-status"
          value={values.status}
          onChange={(e) => set('status', e.target.value as JobStatus)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </motion.div>

      <motion.div variants={fadeUp}>
        <label htmlFor="job-description" className="text-sm font-medium">Description</label>
        <textarea
          id="job-description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <label htmlFor="job-notes" className="text-sm font-medium">Notes</label>
        <textarea
          id="job-notes"
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
        />
      </motion.div>

      {error && <p className="text-sm text-[var(--color-rejected)]">{error}</p>}

      <motion.div variants={fadeUp}>
        <button
          type="submit"
          disabled={saving}
          className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-60"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
      </motion.div>
    </motion.form>
  )
}
