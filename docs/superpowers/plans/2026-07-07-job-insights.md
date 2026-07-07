# Job Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add applied-date tracking, application source, rejection reason (modal on drag-to-Rejected), and a weekly stats bar to JobTrackr.

**Architecture:** Three new nullable columns on `jobs` (`source`, `rejection_reason`, `rejected_at`); `applied_at` already exists. Value lists live in `lib/constants.ts`, enforced server-side. Two new pure functions (`lib/stats.ts`, updated `lib/reminders.ts`) are unit-tested with Vitest. UI: new fields in `JobForm`, a `RejectionModal` wired into the Kanban `Board`, an applied-date footer on `JobCard`, and a `StatsBar` on the dashboard.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, Supabase, @dnd-kit, Vitest.

## Global Constraints

- TypeScript strict — no `any`.
- No new packages. No external AI APIs.
- Server Components by default; `'use client'` only where interactive.
- Named exports for components, default export for pages.
- No inline styles — Tailwind utilities only; design tokens via CSS vars (e.g. `var(--color-border)`, `bg-surface`, `text-brand-muted`, `text-accent`).
- No hardcoded status/label/option strings in components — pull from `lib/constants.ts`.
- User-facing errors human-readable; server logs prefixed `[jobs]` / `[jobs/id]`.
- Never let client set `id`/`user_id`/`created_at`; allowlist all DB writes.
- Run a single test file with: `npx vitest run <path>`.
- Type check with: `npx tsc --noEmit`.

---

### Task 1: Schema, constants, and types

**Files:**
- Create: `supabase/migrations/0005_job_insights.sql`
- Modify: `lib/constants.ts` (append)
- Modify: `types/index.ts` (extend `Job`)

**Interfaces:**
- Produces: `APPLICATION_SOURCES` (readonly string tuple), `REJECTION_REASONS` (readonly string tuple); `Job.source?`, `Job.rejection_reason?`, `Job.rejected_at?`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_job_insights.sql`:

```sql
-- supabase/migrations/0005_job_insights.sql
-- applied_at already exists (0001). Add source, rejection reason, and a
-- rejected timestamp. Values validated server-side, not via DB constraints.

alter table jobs add column source           text;
alter table jobs add column rejection_reason text;
alter table jobs add column rejected_at      timestamptz;
```

- [ ] **Step 2: Append constants**

Add to the end of `lib/constants.ts`:

```ts
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
```

- [ ] **Step 3: Extend the Job type**

In `types/index.ts`, add three optional fields to the `Job` interface (after `location?`):

```ts
  source?: string
  rejection_reason?: string
  rejected_at?: string
```

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0005_job_insights.sql lib/constants.ts types/index.ts
git commit -m "feat: add source, rejection_reason, rejected_at columns + constants"
```

---

### Task 2: Staleness from applied date

**Files:**
- Modify: `lib/reminders.ts`
- Create: `__tests__/lib/reminders.test.ts`

**Interfaces:**
- Consumes: `Job` type, `STALE_DAYS` from `lib/constants`.
- Produces: `getStaleJobs(jobs: Job[], now?: Date): Job[]` — unchanged signature; now measures staleness from `applied_at ?? last_updated`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/reminders.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getStaleJobs } from '@/lib/reminders'
import type { Job } from '@/types'

function job(overrides: Partial<Job>): Job {
  return {
    id: '1', user_id: 'u', company: 'C', role: 'R', status: 'applied',
    tags: [], last_updated: '2026-07-07T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const now = new Date('2026-07-07T00:00:00Z')

describe('getStaleJobs', () => {
  it('flags an applied job whose applied_at is older than 7 days', () => {
    const stale = job({ applied_at: '2026-06-01T00:00:00Z', last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleJobs([stale], now)).toHaveLength(1)
  })

  it('measures from applied_at even when last_updated is recent', () => {
    // Edited yesterday, but applied 3 weeks ago → still stale.
    const stale = job({ applied_at: '2026-06-15T00:00:00Z', last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleJobs([stale], now)).toHaveLength(1)
  })

  it('falls back to last_updated when applied_at is missing', () => {
    const fresh = job({ applied_at: undefined, last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleJobs([fresh], now)).toHaveLength(0)
  })

  it('ignores non-applied jobs', () => {
    const saved = job({ status: 'saved', applied_at: '2026-01-01T00:00:00Z' })
    expect(getStaleJobs([saved], now)).toHaveLength(0)
  })

  it('does not flag an applied job within the 7-day window', () => {
    const fresh = job({ applied_at: '2026-07-05T00:00:00Z' })
    expect(getStaleJobs([fresh], now)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/reminders.test.ts`
Expected: FAIL — the "measures from applied_at" case fails (current code uses `last_updated` only).

- [ ] **Step 3: Update the implementation**

Replace the body of `lib/reminders.ts`:

```ts
import type { Job } from '@/types'
import { STALE_DAYS } from '@/lib/constants'

export function getStaleJobs(jobs: Job[], now: Date = new Date()): Job[] {
  const staleThresholdMs = STALE_DAYS * 24 * 60 * 60 * 1000

  return jobs.filter((job) => {
    if (job.status !== 'applied') return false
    // Follow-up timing is measured from when the user actually applied;
    // fall back to last_updated when no applied date was recorded.
    const reference = job.applied_at ?? job.last_updated
    const referenceMs = new Date(reference).getTime()
    return now.getTime() - referenceMs > staleThresholdMs
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/reminders.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/reminders.ts __tests__/lib/reminders.test.ts
git commit -m "feat: measure staleness from applied_at with last_updated fallback"
```

---

### Task 3: Weekly stats function

**Files:**
- Create: `lib/stats.ts`
- Create: `__tests__/lib/stats.test.ts`

**Interfaces:**
- Consumes: `Job` type.
- Produces: `WeeklyStats` interface `{ appliedThisWeek: number; activeInterviews: number; offers: number; rejectedThisWeek: number }` and `getWeeklyStats(jobs: Job[], now?: Date): WeeklyStats`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getWeeklyStats } from '@/lib/stats'
import type { Job } from '@/types'

function job(overrides: Partial<Job>): Job {
  return {
    id: '1', user_id: 'u', company: 'C', role: 'R', status: 'saved',
    tags: [], last_updated: '2026-07-07T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const now = new Date('2026-07-07T00:00:00Z')

describe('getWeeklyStats', () => {
  it('returns all zeros for an empty list', () => {
    expect(getWeeklyStats([], now)).toEqual({
      appliedThisWeek: 0, activeInterviews: 0, offers: 0, rejectedThisWeek: 0,
    })
  })

  it('counts jobs applied within the last 7 days', () => {
    const jobs = [
      job({ applied_at: '2026-07-05T00:00:00Z' }), // in window
      job({ applied_at: '2026-06-01T00:00:00Z' }), // out of window
      job({ applied_at: undefined }),              // never applied
    ]
    expect(getWeeklyStats(jobs, now).appliedThisWeek).toBe(1)
  })

  it('counts live interview and offer columns regardless of date', () => {
    const jobs = [
      job({ status: 'interview' }),
      job({ status: 'interview' }),
      job({ status: 'offer' }),
    ]
    const stats = getWeeklyStats(jobs, now)
    expect(stats.activeInterviews).toBe(2)
    expect(stats.offers).toBe(1)
  })

  it('counts jobs rejected within the last 7 days', () => {
    const jobs = [
      job({ status: 'rejected', rejected_at: '2026-07-06T00:00:00Z' }), // in window
      job({ status: 'rejected', rejected_at: '2026-05-01T00:00:00Z' }), // out of window
    ]
    expect(getWeeklyStats(jobs, now).rejectedThisWeek).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/stats.test.ts`
Expected: FAIL with "Failed to resolve import" / `getWeeklyStats is not a function`.

- [ ] **Step 3: Write the implementation**

Create `lib/stats.ts`:

```ts
import type { Job } from '@/types'

export interface WeeklyStats {
  appliedThisWeek: number
  activeInterviews: number
  offers: number
  rejectedThisWeek: number
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function withinWeek(iso: string | undefined, now: Date): boolean {
  if (!iso) return false
  return now.getTime() - new Date(iso).getTime() <= WEEK_MS
}

export function getWeeklyStats(jobs: Job[], now: Date = new Date()): WeeklyStats {
  return {
    appliedThisWeek: jobs.filter((j) => withinWeek(j.applied_at, now)).length,
    activeInterviews: jobs.filter((j) => j.status === 'interview').length,
    offers: jobs.filter((j) => j.status === 'offer').length,
    rejectedThisWeek: jobs.filter((j) => withinWeek(j.rejected_at, now)).length,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/stats.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts __tests__/lib/stats.test.ts
git commit -m "feat: add getWeeklyStats for dashboard stats bar"
```

---

### Task 4: API validation for new fields

**Files:**
- Modify: `app/api/jobs/route.ts` (POST — create)
- Modify: `app/api/jobs/[id]/route.ts` (PATCH — update)

**Interfaces:**
- Consumes: `APPLICATION_SOURCES`, `REJECTION_REASONS` from `lib/constants`.
- Produces: POST accepts `applied_at`, `source`. PATCH accepts `applied_at`, `source`, `rejection_reason`, and manages `rejected_at`.

- [ ] **Step 1: Update POST (create) validation**

In `app/api/jobs/route.ts`:

Add to the import from constants:

```ts
import { JOB_STATUSES, MAX_FIELD_LENGTH, MAX_TAGS, MAX_TEXT_LENGTH, APPLICATION_SOURCES } from '@/lib/constants'
```

Add to the `InsertJobData` interface (after `location?`):

```ts
  applied_at?: string | null
  source?: string | null
  rejected_at?: string | null
```

Add these validations inside `validateJobInput`, after the existing `notes` length check:

```ts
  if (b.source !== undefined && b.source !== '' && !APPLICATION_SOURCES.includes(b.source as never)) {
    return { valid: false, error: 'Pick a source from the list.' }
  }
  if (b.applied_at !== undefined && b.applied_at !== '' && b.applied_at !== null) {
    if (typeof b.applied_at !== 'string' || Number.isNaN(Date.parse(b.applied_at))) {
      return { valid: false, error: 'Enter a valid applied date.' }
    }
  }
```

Add to the allowlist assembly, before `return { valid: true, data: insertData }`:

```ts
  if (typeof b.applied_at === 'string' && b.applied_at !== '') {
    insertData.applied_at = b.applied_at
  }
  if (typeof b.source === 'string' && b.source !== '') {
    insertData.source = b.source
  }
  // A job created directly in Rejected gets a rejected timestamp.
  if (insertData.status === 'rejected') {
    insertData.rejected_at = new Date().toISOString()
  }
```

- [ ] **Step 2: Update PATCH (update) validation**

In `app/api/jobs/[id]/route.ts`:

Add to the import from constants:

```ts
import { JOB_STATUSES, MAX_FIELD_LENGTH, MAX_TAGS, MAX_TEXT_LENGTH, APPLICATION_SOURCES, REJECTION_REASONS } from '@/lib/constants'
```

Add to the `PatchJobData` interface (after `notes?`):

```ts
  applied_at?: string | null
  source?: string | null
  rejection_reason?: string | null
  rejected_at?: string | null
```

Add these validations inside `validatePatchInput`, after the existing `description` length check:

```ts
  if (b.source !== undefined && b.source !== '' && b.source !== null && !APPLICATION_SOURCES.includes(b.source as never)) {
    return { valid: false, error: 'Pick a source from the list.' }
  }
  if (b.applied_at !== undefined && b.applied_at !== '' && b.applied_at !== null) {
    if (typeof b.applied_at !== 'string' || Number.isNaN(Date.parse(b.applied_at))) {
      return { valid: false, error: 'Enter a valid applied date.' }
    }
  }
  if (b.rejection_reason !== undefined && b.rejection_reason !== '' && b.rejection_reason !== null && !REJECTION_REASONS.includes(b.rejection_reason as never)) {
    return { valid: false, error: 'Pick a rejection reason from the list.' }
  }
```

Add to the allowlist assembly, after the existing `notes` assignment and before `return { valid: true, data }`:

```ts
  // applied_at: non-empty string sets the date; explicit empty string clears it.
  if (typeof b.applied_at === 'string') {
    data.applied_at = b.applied_at === '' ? null : b.applied_at
  }
  if (typeof b.source === 'string') {
    data.source = b.source === '' ? null : b.source
  }

  // Rejection bookkeeping is driven by the target status:
  //  - moving INTO rejected stamps rejected_at and stores the (optional) reason
  //  - moving OUT of rejected clears both, keeping the data honest
  //  - editing the reason while already rejected (no status in payload) just updates it
  if (data.status === 'rejected') {
    data.rejected_at = new Date().toISOString()
    data.rejection_reason =
      typeof b.rejection_reason === 'string' && b.rejection_reason !== '' ? b.rejection_reason : null
  } else if (typeof data.status === 'string') {
    data.rejected_at = null
    data.rejection_reason = null
  } else if (typeof b.rejection_reason === 'string') {
    data.rejection_reason = b.rejection_reason === '' ? null : b.rejection_reason
  }
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/jobs/route.ts app/api/jobs/[id]/route.ts
git commit -m "feat: validate applied_at, source, rejection_reason in jobs API"
```

---

### Task 5: JobForm fields

**Files:**
- Modify: `components/jobs/JobForm.tsx`

**Interfaces:**
- Consumes: `APPLICATION_SOURCES`, `REJECTION_REASONS` from `lib/constants`; `Job.applied_at`, `Job.source`, `Job.rejection_reason`.
- Produces: `JobFormValues` gains `applied_at: string`, `source: string`, `rejection_reason: string`. These flow unchanged through `JobsProvider` (which spreads values into the request body).

- [ ] **Step 1: Extend JobFormValues and defaults**

In `components/jobs/JobForm.tsx`:

Add to the import from constants:

```ts
import { JOB_STATUSES, STATUS_LABELS, APPLICATION_SOURCES, REJECTION_REASONS } from '@/lib/constants'
```

Add to the `JobFormValues` interface (after `notes: string`):

```ts
  applied_at: string
  source: string
  rejection_reason: string
```

Add to the object returned by `toDefaults` (after `notes:`):

```ts
    // <input type="date"> needs YYYY-MM-DD; applied_at is stored as an ISO timestamp.
    applied_at: 'applied_at' in (initial ?? {}) ? ((initial as Job).applied_at ?? '').slice(0, 10) : '',
    source: 'source' in (initial ?? {}) ? (initial as Job).source ?? '' : '',
    rejection_reason: 'rejection_reason' in (initial ?? {}) ? (initial as Job).rejection_reason ?? '' : '',
```

- [ ] **Step 2: Add the Applied-date + Source row**

Insert this block immediately after the salary/location `motion.div` grid (after the closing `</motion.div>` on the line following the location input, before the Job URL block):

```tsx
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="job-applied-at" className="text-sm font-medium">Applied on</label>
          <input
            id="job-applied-at"
            type="date"
            value={values.applied_at}
            onChange={(e) => set('applied_at', e.target.value)}
            className="w-full border border-[var(--color-border)] bg-surface rounded-md px-3 py-2 text-sm mt-1 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label htmlFor="job-source" className="text-sm font-medium">Source</label>
          <select
            id="job-source"
            value={values.source}
            onChange={(e) => set('source', e.target.value)}
            className="w-full border border-[var(--color-border)] bg-surface rounded-md px-3 py-2 text-sm mt-1 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-colors"
          >
            <option value="">Not set</option>
            {APPLICATION_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </motion.div>
```

- [ ] **Step 3: Add the conditional Rejection-reason field**

Insert this block immediately after the Status `motion.div` (after its closing `</motion.div>`, before the Description block):

```tsx
      {values.status === 'rejected' && (
        <motion.div variants={fadeUp}>
          <label htmlFor="job-rejection-reason" className="text-sm font-medium">Rejection reason</label>
          <select
            id="job-rejection-reason"
            value={values.rejection_reason}
            onChange={(e) => set('rejection_reason', e.target.value)}
            className="w-full border border-[var(--color-border)] bg-surface rounded-md px-3 py-2 text-sm mt-1 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-colors"
          >
            <option value="">Not set</option>
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </motion.div>
      )}
```

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/jobs/JobForm.tsx
git commit -m "feat: add applied date, source, and rejection reason fields to JobForm"
```

---

### Task 6: Pass rejection reason through updateJobStatus

**Files:**
- Modify: `contexts/JobsProvider.tsx`

**Interfaces:**
- Consumes: existing PATCH `/api/jobs/:id`.
- Produces: `updateJobStatus(id: string, status: JobStatus, reason?: string): Promise<void>` — optional `reason` is sent as `rejection_reason` in the PATCH body. `JobsContextValue.updateJobStatus` signature updated to match.

- [ ] **Step 1: Update the context interface**

In `contexts/JobsProvider.tsx`, change the `updateJobStatus` line in `JobsContextValue`:

```ts
  updateJobStatus: (id: string, status: JobStatus, reason?: string) => Promise<void>
```

- [ ] **Step 2: Update the implementation**

Replace the `updateJobStatus` callback body so it forwards the reason:

```ts
  const updateJobStatus = useCallback(async (id: string, status: JobStatus, reason?: string): Promise<void> => {
    let previous: Job[] = []
    setJobs((prev) => {
      previous = prev
      return prev.map((j) => (j.id === id ? { ...j, status } : j))
    })
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reason !== undefined ? { status, rejection_reason: reason } : { status }),
    })
    if (!res.ok) {
      setJobs(previous)
      toast.error("Couldn't update status.", { duration: Infinity })
      throw new Error("Couldn't update status.")
    }
    const json = (await res.json()) as JobResponse
    // Replace with the server row so rejected_at / cleared reason stay in sync.
    setJobs((prev) => prev.map((j) => (j.id === id ? json.data : j)))
    toast.success(`Moved to ${STATUS_LABELS[status]}`)
  }, [])
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add contexts/JobsProvider.tsx
git commit -m "feat: forward optional rejection reason through updateJobStatus"
```

---

### Task 7: Rejection modal on drag-to-Rejected

**Files:**
- Create: `components/kanban/RejectionModal.tsx`
- Modify: `components/kanban/Board.tsx`

**Interfaces:**
- Consumes: `REJECTION_REASONS` from `lib/constants`; `updateJobStatus(id, status, reason?)` from `useJobs`.
- Produces: `RejectionModal` component with props `{ open: boolean; onSelect: (reason: string) => void; onSkip: () => void; onCancel: () => void }`.

- [ ] **Step 1: Create the modal component**

Create `components/kanban/RejectionModal.tsx`:

```tsx
'use client'

import { REJECTION_REASONS } from '@/lib/constants'

interface Props {
  open: boolean
  onSelect: (reason: string) => void
  onSkip: () => void
  onCancel: () => void
}

export function RejectionModal({ open, onSelect, onSkip, onCancel }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm bg-surface border border-[var(--color-border)] rounded-lg shadow-card-hover p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Rejection reason"
      >
        <h2 className="text-base font-semibold text-brand-text">Why the rejection?</h2>
        <p className="text-sm text-brand-muted mt-1">Optional — helps you spot patterns later.</p>
        <div className="grid gap-2 mt-4">
          {REJECTION_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onSelect(reason)}
              className="w-full text-left border border-[var(--color-border)] rounded-md px-3 py-2 text-sm hover:border-accent hover:text-accent transition-colors"
            >
              {reason}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-brand-muted hover:text-brand-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-accent hover:underline"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire the modal into the Board**

Replace the full contents of `components/kanban/Board.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useJobs } from '@/hooks/useJobs'
import { JOB_STATUSES } from '@/lib/constants'
import type { Job, JobStatus } from '@/types'
import { Column } from './Column'
import { RejectionModal } from './RejectionModal'

function resolveTargetStatus(overId: string, jobs: Job[]): JobStatus | null {
  if (JOB_STATUSES.includes(overId as JobStatus)) {
    return overId as JobStatus
  }
  const overJob = jobs.find((j) => j.id === overId)
  return overJob ? overJob.status : null
}

export function Board() {
  const { jobs, loading, error, updateJobStatus } = useJobs()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  // When a card is dragged into Rejected we hold its id and prompt for a reason
  // before committing the move.
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null)

  function commitStatus(jobId: string, status: JobStatus, reason?: string) {
    updateJobStatus(jobId, status, reason).catch(() => {
      // useJobs reverts optimistic state + toasts on failure.
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const jobId = active.id as string
    const targetStatus = resolveTargetStatus(over.id as string, jobs)
    const job = jobs.find((j) => j.id === jobId)
    if (!job || !targetStatus || job.status === targetStatus) return

    if (targetStatus === 'rejected') {
      setPendingRejectId(jobId)
      return
    }
    commitStatus(jobId, targetStatus)
  }

  if (loading) {
    return <div className="p-6 text-sm text-brand-muted">Loading board...</div>
  }

  if (error) {
    return <div className="p-6 text-sm text-[var(--color-rejected)]">{error}</div>
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-4 p-6 items-start min-h-[calc(100vh-var(--topbar-height))] min-w-225 overflow-x-auto">
          {JOB_STATUSES.map((status) => (
            <Column key={status} status={status} jobs={jobs.filter((j) => j.status === status)} />
          ))}
        </div>
      </DndContext>

      <RejectionModal
        open={pendingRejectId !== null}
        onSelect={(reason) => {
          if (pendingRejectId) commitStatus(pendingRejectId, 'rejected', reason)
          setPendingRejectId(null)
        }}
        onSkip={() => {
          if (pendingRejectId) commitStatus(pendingRejectId, 'rejected', '')
          setPendingRejectId(null)
        }}
        onCancel={() => setPendingRejectId(null)}
      />
    </>
  )
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the dashboard, drag a card into Rejected.
Expected: modal appears; picking a reason or Skip moves the card to Rejected; Cancel/backdrop/Esc leaves the card in place. (Esc closes via backdrop-equivalent only if implemented; Cancel button always works.)

- [ ] **Step 5: Commit**

```bash
git add components/kanban/RejectionModal.tsx components/kanban/Board.tsx
git commit -m "feat: prompt for rejection reason when dragging a card to Rejected"
```

---

### Task 8: Applied date on the job card

**Files:**
- Modify: `components/kanban/JobCard.tsx`

**Interfaces:**
- Consumes: `Job.applied_at`, `Job.last_updated`; `formatDate` from `lib/utils`.
- Produces: card footer shows `Applied {date}` when `applied_at` is set, else the existing `last_updated` date.

- [ ] **Step 1: Update the footer**

In `components/kanban/JobCard.tsx`, replace the footer `div` (the block rendering `{formatDate(job.last_updated)}`):

```tsx
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)] text-xs text-brand-muted font-mono">
          {job.applied_at ? `Applied ${formatDate(job.applied_at)}` : formatDate(job.last_updated)}
        </div>
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/kanban/JobCard.tsx
git commit -m "feat: show applied date on job cards when set"
```

---

### Task 9: Source + rejection reason on the detail page

**Files:**
- Modify: `app/(dashboard)/jobs/[id]/page.tsx`

**Interfaces:**
- Consumes: `Job.source`, `Job.rejection_reason` (already-fetched job).
- Produces: read-only `Source` and (when rejected) `Rejection reason` rows in the detail `<dl>`.

- [ ] **Step 1: Add detail rows**

In `app/(dashboard)/jobs/[id]/page.tsx`, inside the `<dl>`, add after the `job.location` block (before the `job.applied_at` block):

```tsx
          {job.source && (
            <div><dt className="text-brand-muted">Source</dt><dd>{job.source}</dd></div>
          )}
          {job.status === 'rejected' && job.rejection_reason && (
            <div><dt className="text-brand-muted">Rejection reason</dt><dd>{job.rejection_reason}</dd></div>
          )}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/jobs/[id]/page.tsx"
git commit -m "feat: show source and rejection reason on job detail page"
```

---

### Task 10: Weekly stats bar

**Files:**
- Create: `components/dashboard/StatsBar.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getWeeklyStats` from `lib/stats`; `jobs` from `useJobs`.
- Produces: `StatsBar` component (named export) rendered above `<Board />`.

- [ ] **Step 1: Create the StatsBar**

Create `components/dashboard/StatsBar.tsx`:

```tsx
'use client'

import { useJobs } from '@/hooks/useJobs'
import { getWeeklyStats } from '@/lib/stats'

export function StatsBar() {
  const { jobs, loading } = useJobs()
  if (loading) return null

  const stats = getWeeklyStats(jobs)
  const tiles = [
    { label: 'Applied this week', value: stats.appliedThisWeek },
    { label: 'Active interviews', value: stats.activeInterviews },
    { label: 'Offers', value: stats.offers },
    { label: 'Rejected this week', value: stats.rejectedThisWeek },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pt-6">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-surface border border-[var(--color-border)] rounded-lg p-4 shadow-card"
        >
          <p className="text-2xl font-semibold text-brand-text">{tile.value}</p>
          <p className="text-sm text-brand-muted mt-1">{tile.label}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Render it on the dashboard**

Replace the full contents of `app/(dashboard)/dashboard/page.tsx`:

```tsx
import { Board } from '@/components/kanban/Board'
import { StatsBar } from '@/components/dashboard/StatsBar'

export default function DashboardPage() {
  return (
    <>
      <StatsBar />
      <Board />
    </>
  )
}
```

- [ ] **Step 3: Type check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the dashboard.
Expected: four stat tiles appear above the board with correct counts.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/StatsBar.tsx "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: add weekly stats bar to dashboard"
```

---

### Task 11: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (parser, reminders, stats).

- [ ] **Step 2: Type check + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all PASS.

- [ ] **Step 3: Apply the migration**

Apply `supabase/migrations/0005_job_insights.sql` to the Supabase project (via the Supabase MCP `apply_migration` or the SQL editor). Confirm the three columns exist on `jobs`.

- [ ] **Step 4: End-to-end smoke test**

With `npm run dev`: create a job with an applied date + source; confirm it appears on the card ("Applied …") and detail page; drag it to Rejected and pick a reason; confirm the reason shows on the detail page and the stats bar counts update.
```
