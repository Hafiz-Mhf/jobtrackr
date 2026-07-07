# JobTrackr — Job Insights (4 features) Design

> Date: 2026-07-07
> Status: Approved, pending implementation plan

## Overview

Four features that make the tracker's data richer and the dashboard feel like a real product, all client-side / DB-only — no new packages, no external APIs.

1. **Applied date** — track when the user actually applied, not just when a row was last touched. Drives follow-up timing.
2. **Application source** — where the job was found (Malaysian portals + channels). Stored for later analytics.
3. **Rejection reason** — optional preset captured via a modal when a card is dragged to Rejected.
4. **Weekly stats bar** — 4-tile summary at the top of the dashboard.

## Schema

Migration `supabase/migrations/0005_job_insights.sql`. `applied_at timestamptz` already exists (0001) but is currently never written. Add three columns:

```sql
alter table jobs add column source           text;
alter table jobs add column rejection_reason text;
alter table jobs add column rejected_at      timestamptz;
```

No DB `check` constraints on `source` / `rejection_reason` — the allowed values live in `lib/constants.ts` and are enforced server-side in the API routes. This keeps the value lists cheap to extend without a migration. No new indexes: dataset is per-user and small.

## Constants (`lib/constants.ts`)

```ts
export const APPLICATION_SOURCES = [
  'LinkedIn', 'JobStreet', 'Hiredly', 'Ricebowl', 'Maukerja',
  'Indeed', 'Jobstore', 'Glassdoor', 'Referral', 'Recruiter',
  'Company website', 'Career fair', 'Other',
] as const

export const REJECTION_REASONS = [
  'No response', 'Not qualified', 'Withdrew', 'Offer declined',
] as const
```

## Types (`types/index.ts`)

Extend `Job` with optional `source?: string`, `rejection_reason?: string`, `rejected_at?: string`. (`applied_at?: string` already present.) Extend `JobFormValues` with `applied_at` and `source`.

---

## Feature 1 — Applied date (manual)

- **Set:** manual only. No auto-set on status transition (Q1-C). Optional `<input type="date">` labelled "Applied on" in `JobForm` (add + edit) and on the job detail page.
- **Display:** `JobCard` shows `Applied {formatDate(applied_at)}` when `applied_at` is set; otherwise falls back to the current `last_updated` display. This stops the board's footer from misrepresenting an edit as "the date."
- **API:** POST + PATCH accept `applied_at`. Validate as an ISO date string or empty/undefined; reject malformed values with a human-readable message.
- **Staleness (`lib/reminders.ts`):** measure from `applied_at ?? last_updated` (Q5-A). A job is stale if `status === 'applied'` and the effective date is more than `STALE_DAYS` ago. Editing a job no longer resets its stale clock when an applied date is present.

## Feature 2 — Application source

- **Set:** optional dropdown of the 13 `APPLICATION_SOURCES` values in `JobForm` (add + edit) and the detail page.
- **API:** POST + PATCH accept `source`; reject any value not in `APPLICATION_SOURCES` ("Pick a source from the list.").
- **Analytics:** none this round (Q3-A). Value is stored; the weekly stats bar is the only visible analytics for now. A source→outcome breakdown is a future round.

## Feature 3 — Rejection reason (modal on drag)

- **Trigger:** dragging a card into the Rejected column no longer commits the status change directly. `Board.handleDragEnd` detects a move *into* `rejected` and opens a `RejectionModal` for that job instead.
- **Modal:** 4 preset buttons (`REJECTION_REASONS`) plus a **Skip** button.
  - Choosing a preset → commit move with that reason.
  - Skip → commit move with no reason.
  - Dismiss (Esc / backdrop) → cancel; the card stays in its original column.
- **State commit:** `updateJobStatus` gains an optional `reason` argument. The PATCH route, when the resulting status is `rejected`, sets `rejected_at = now()` server-side and stores `rejection_reason`. When a job leaves `rejected` (any other target status), the route clears both `rejection_reason` and `rejected_at` so the data stays honest.
- **Edit later:** the detail page shows an editable reason dropdown when the job's status is `rejected`.
- **Failure:** PATCH failure reverts the optimistic move and shows the existing error toast.

## Feature 4 — Weekly stats bar

- **`lib/stats.ts`** — pure function `getWeeklyStats(jobs: Job[], now?: Date)` returning:
  - `appliedThisWeek` — count of jobs whose `applied_at` is within the last 7 days.
  - `activeInterviews` — live count of `status === 'interview'` (not time-windowed).
  - `offers` — live count of `status === 'offer'` (not time-windowed).
  - `rejectedThisWeek` — count of jobs whose `rejected_at` is within the last 7 days.
- **`StatsBar` component** — renders 4 tiles. Reads jobs from the existing `useJobs` context; no extra fetch.
- **Dashboard page** — renders `<StatsBar />` above `<Board />`.

---

## Testing

- `lib/stats.ts` — unit tests, TDD (windowing edges: exactly 7 days, null dates, empty list).
- `lib/reminders.ts` — updated unit tests for `applied_at ?? last_updated` fallback and the applied-date staleness path.
- Existing parser tests untouched.

## Error handling

- All new inputs validated server-side with human-readable messages; malformed date → "Enter a valid applied date."; bad source → "Pick a source from the list."
- Modal drag failure reverts optimistic state and toasts (existing pattern in `JobsProvider`).
- Parser/manual-entry fallbacks unchanged.

## Affected files

Migration `0005_job_insights.sql`, `lib/constants.ts`, `types/index.ts`, `components/jobs/JobForm.tsx`, `components/kanban/JobCard.tsx`, `components/kanban/Board.tsx`, new `components/kanban/RejectionModal.tsx`, `contexts/JobsProvider.tsx`, `app/api/jobs/route.ts`, `app/api/jobs/[id]/route.ts`, `lib/reminders.ts`, new `lib/stats.ts`, new `components/dashboard/StatsBar.tsx`, `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/jobs/[id]/page.tsx`. No new packages.
