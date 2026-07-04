'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParseInput } from '@/components/jobs/ParseInput'
import { JobForm, type JobFormValues } from '@/components/jobs/JobForm'
import { useJobs } from '@/hooks/useJobs'
import type { ParsedJob } from '@/types'

export default function NewJobPage() {
  const [parsed, setParsed] = useState<ParsedJob | null>(null)
  const [showForm, setShowForm] = useState(false)
  const { createJob } = useJobs()
  const router = useRouter()

  async function handleSubmit(values: JobFormValues) {
    const job = await createJob(values)
    router.push(`/jobs/${job.id}`)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Add a job</h1>

      {!showForm && (
        <ParseInput
          onParsed={(p) => {
            setParsed(p)
            setShowForm(true)
          }}
          onManual={() => setShowForm(true)}
        />
      )}

      {showForm && (
        <div className="bg-surface border border-[var(--color-border)] rounded-xl p-6">
          <JobForm
            initial={parsed ?? undefined}
            onSubmit={handleSubmit}
            submitLabel="Save job"
            reveal={parsed !== null}
          />
        </div>
      )}
    </div>
  )
}
