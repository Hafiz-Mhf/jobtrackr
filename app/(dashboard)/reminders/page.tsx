'use client'

import Link from 'next/link'
import { BellOff } from 'lucide-react'
import { useJobs } from '@/hooks/useJobs'
import { useReminders } from '@/hooks/useReminders'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { ReminderFlag } from '@/components/jobs/ReminderFlag'

export default function RemindersPage() {
  const { jobs, loading, updateJobStatus } = useJobs()
  const { staleJobs } = useReminders(jobs)

  if (loading) return <div className="p-6 text-sm text-brand-muted">Loading...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Reminders</h1>
      {staleJobs.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-24">
          <div className="size-16 rounded-full bg-accent-light flex items-center justify-center mb-5">
            <BellOff className="size-7 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-brand-text">No stale applications</h2>
          <p className="text-sm text-brand-muted mt-1 max-w-xs">
            Nice work staying on top of things — nothing has gone quiet for 7+ days.
          </p>
        </div>
      )}
      <div className="space-y-3">
        {staleJobs.map((job) => (
          <div key={job.id} className="bg-surface border border-[var(--color-border)] rounded-md p-4">
            <div className="flex items-center justify-between">
              <Link href={`/jobs/${job.id}`}>
                <p className="font-semibold">{job.company}</p>
                <p className="text-sm text-brand-muted">{job.role}</p>
              </Link>
              <StatusBadge status={job.status} />
            </div>
            <ReminderFlag job={job} />
            <button
              onClick={() => updateJobStatus(job.id, 'interview')}
              className="mt-3 text-xs font-semibold text-accent underline"
            >
              Update Status
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
