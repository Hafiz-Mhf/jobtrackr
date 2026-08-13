# CLAUDE.md — JobTrackr

> This file is the single source of truth for Claude Code on this project.
> Read this before touching any file. Follow every directive here unless the user explicitly overrides it in chat.

---

## Project Overview

**JobTrackr** is a smart job application tracker built for junior-to-mid-level developers and tech job seekers. It eliminates the manual work of tracking applications through a clean Kanban board, client-side JD parsing, curated interview prep, and stale-application reminders — all with zero external AI API costs.

**Target audience:** Tech job seekers actively applying to multiple roles who want to stay organized without spreadsheets or paid tools.

**Core value proposition:** Paste a job description → key info is extracted automatically → track progress on a Kanban board → get role-matched interview questions → never miss a follow-up.

> ⚠️ No external AI API is used in this project. All "smart" features are powered by client-side parsing logic and curated data. This keeps the app free to run and deploy.

### Key Features (in priority order)

1. **Smart JD Parser & Skill Extractor** — paste raw job description text; client-side logic extracts company, role, salary, location, and tech tags. Leverages an alias-aware skills dictionary and learns new custom tags per-user.
2. **Kanban Pipeline** — drag-and-drop board: `Saved → Applied → Interview → Offer → Rejected`. Prompts for rejection reason via modal when dragging a card to `Rejected`.
3. **Dashboard Weekly Stats** — a 4-tile summary showing: applied this week, active interviews, offers, and rejected this week.
4. **Interview Prep** — curated question bank matched to detected tech tags (React, Node, SQL, etc.), displayed alongside inline notes.
5. **Follow-up Reminder** — flags applications with no status update after 7 days, measured from the applied date (falling back to last updated).
6. **User Profile & Privacy** — profile editing (display name and avatar image upload), data export (JSON download), and self-service account deletion.

---

## Tech Stack & Architecture

### Exact Versions

| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| UI Runtime | React | 19.x (React Compiler enabled) |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui | latest (React 19 / Tailwind v4 build) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | 6.x |
| Database | Supabase (PostgreSQL) | latest JS client v2 |
| Auth | Supabase Auth (email + Google OAuth) | built-in, via `@supabase/ssr` |
| Icons | Lucide React | latest |
| Animations | Framer Motion | 11.x |
| Date handling | date-fns | 3.x |
| Deployment | Vercel | — |

> No `@anthropic-ai/sdk` or any AI API package. Do not install one.
> Next 16 defaults to Turbopack — no webpack config needed. Route protection uses `proxy.ts` (renamed from `middleware.ts` in Next 16), exported function named `proxy`. Tailwind v4 config lives in CSS via `@theme` (or `@config` compat mode pointing at `tailwind.config.ts`) — see Tailwind Config Additions section for how design.md's token system maps over.

### Folder Structure

```
jobtrackr/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx            # Sign in / sign up / request reset link
│   │   ├── update-password/
│   │   │   └── page.tsx            # Set a new password (needs recovery session)
│   │   └── callback/
│   │       └── route.ts            # Code exchange; honours ?next= (same-origin only)
│   ├── error.tsx                   # Route-level error boundary
│   ├── global-error.tsx            # Root-layout failures (own html/body)
│   ├── not-found.tsx               # 404
│   ├── privacy/ terms/ support/    # Public legal + contact pages
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + topbar shell
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Kanban board
│   │   ├── jobs/
│   │   │   ├── page.tsx            # Job list view
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Add job (paste JD or manual form)
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Job detail + interview prep
│   │   └── reminders/
│   │       └── page.tsx            # Flagged stale applications
│   └── api/
│       └── jobs/
│           └── route.ts            # CRUD: create/list jobs
├── components/
│   ├── kanban/
│   │   ├── Board.tsx
│   │   ├── Column.tsx
│   │   └── JobCard.tsx
│   ├── jobs/
│   │   ├── JobForm.tsx             # Manual entry form
│   │   ├── ParseInput.tsx          # JD paste → client-side parse
│   │   ├── StatusBadge.tsx
│   │   └── JobIcon.tsx             # Renders the icon for a job (see lib/job-icon.ts)
│   ├── prep/
│   │   ├── PrepPanel.tsx           # Shows matched questions
│   │   └── QuestionCard.tsx
│   ├── profile/
│   │   ├── ProfileForm.tsx         # Display name + avatar
│   │   └── DangerZone.tsx          # Export data, delete account
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── MobileNav.tsx
│   └── ui/                         # shadcn auto-generated components
│       ├── ConfirmDialog.tsx       # Shared confirm for destructive actions
│       ├── LoadFailure.tsx         # Shared "didn't load / try again" state
│       └── Skeleton.tsx            # Per-page loading skeletons
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   └── server.ts               # Server client (RSC / API routes)
│   ├── extract/                    # URL → job fields (server-side, see below)
│   │   ├── fetch-page.ts           # Capped, timed fetch with manual redirects
│   │   ├── url-guard.ts            # https-only, blocks private/internal hosts
│   │   ├── jsonld.ts               # JobPosting structured data (level 1)
│   │   ├── metadata.ts             # Open Graph fallback (level 2)
│   │   ├── content-region.ts       # Isolates the posting container (level 3)
│   │   ├── html-to-text.ts         # HTML → text, drops script/style/nav/footer
│   │   ├── rate-limit.ts           # Per-user throttle
│   │   └── errors.ts               # Typed codes → human-readable copy
│   ├── parser.ts                   # Client-side JD text parser (regex + heuristics)
│   ├── interview-questions.ts      # Curated question bank keyed by tech tag
│   ├── reminders.ts                # Stale job detection + getStaleDays (shared clock)
│   ├── job-icon.ts                 # Role/tags → icon kind (string, not a component)
│   ├── jobs-state.ts               # Per-row rollback for failed optimistic writes
│   ├── validation.ts               # Shared field + avatar file validation
│   └── utils.ts                    # cn(), formatDate(), etc.
├── types/
│   └── index.ts                    # All shared TypeScript types
├── hooks/
│   ├── useJobs.ts
│   ├── useParser.ts
│   └── useReminders.ts
├── styles/
│   └── globals.css
├── public/
├── .env.local                      # Never commit this
├── CLAUDE.md                       # ← You are here
├── design.md
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Database Schema (Supabase / PostgreSQL)

```sql
-- Users managed by Supabase Auth

-- 1. Profiles (auto-created on signup via trigger handle_new_user)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "select own profile" on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 2. Jobs
create table public.jobs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  company          text not null,
  role             text not null,
  url              text,
  description      text,
  status           text not null default 'saved' check (status in ('saved','applied','interview','offer','rejected')),
  salary_range     text,
  location         text,
  source           text,                         -- LinkedIn, JobStreet, Referral, etc.
  rejection_reason text,                         -- Preset or skipped reasons
  rejected_at      timestamptz,
  tags             text[] not null default '{}',
  notes            text,
  applied_at       timestamptz,
  status_changed_at timestamptz not null default now(),  -- when the job entered its current stage
  last_updated     timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

alter table public.jobs enable row level security;
create policy "Users can select their own jobs" on jobs for select using (auth.uid() = user_id);
create policy "Users can insert their own jobs" on jobs for insert with check (auth.uid() = user_id);
create policy "Users can update their own jobs" on jobs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own jobs" on jobs for delete using (auth.uid() = user_id);

create index jobs_user_id_idx on jobs (user_id);
create index jobs_status_idx on jobs (status);

-- 3. User Tags (learned custom tags per user)
create table public.user_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tag        text not null,
  created_at timestamptz not null default now()
);

create unique index user_tags_user_tag_lower_idx on public.user_tags (user_id, lower(tag));
create index user_tags_user_id_idx on public.user_tags (user_id);

alter table public.user_tags enable row level security;
create policy "user_tags_select_own" on public.user_tags for select using (auth.uid() = user_id);
create policy "user_tags_insert_own" on public.user_tags for insert with check (auth.uid() = user_id);
create policy "user_tags_delete_own" on public.user_tags for delete using (auth.uid() = user_id);
```

> The `interview_prep` table is removed. Interview questions are generated client-side from `lib/interview-questions.ts` using the job's `tags` array — no DB storage needed.

### TypeScript Types

```ts
// types/index.ts

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
  status_changed_at: string   // server-owned; set only on a real status change
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
```

---

## Smart Parser — How It Works

No AI. Uses alias-aware dictionary matching and custom tag learning. Runs entirely in the browser.

```ts
// lib/parser.ts

import type { ParsedJob } from '@/types'
import { matchDictionary, matchCustomTags, normalizeTag } from '@/lib/skills'

export function parseJobDescription(text: string, customTags: string[] = []): ParsedJob {
  return {
    company:      extractCompany(text),
    role:         extractRole(text),
    salary_range: extractSalary(text),
    location:     extractLocation(text),
    tags:         extractTags(text, customTags),
    description:  text.trim(),
  }
}

// --- Extraction helpers ---
// Extracts role, salary, location, and company using custom pattern-matching,
// with dedicated heuristics for Malaysian cities/states and role keywords.

function extractTags(text: string, customTags: string[] = []): string[] {
  const merged = [...matchDictionary(text), ...matchCustomTags(text, customTags)].map(normalizeTag)
  return [...new Set(merged)]
}
```

### Pasting a URL instead of text

`POST /api/jobs/fetch-url` fetches the page server-side (the browser cannot, due
to CORS) and works down three levels of confidence. Full rationale and the
measured behaviour of each job board live in
`docs/superpowers/specs/2026-08-03-url-job-extraction-design.md`.

| Level | Source | Module |
|---|---|---|
| 1 | `JobPosting` JSON-LD | `lib/extract/jsonld.ts` |
| 2 | Open Graph metadata | `lib/extract/metadata.ts` |
| 3 | Text of the **scoped** posting container | `lib/extract/content-region.ts` → `lib/parser.ts` |

Rules when working in this area:

- **Never parse the whole page.** Always scope through `isolateJobContent` first.
  Job boards surround the posting with a "similar jobs" sidebar; parsing the
  shell pulled another job's salary and unrelated tags into the form.
- **Declared metadata outranks scraped text.** Only fields the page actually
  declared may override the parsed result.
- **Container hints only, never field selectors.** `content-region.ts` may know
  that LinkedIn wraps postings in `.description__text`, but no field is ever
  read from a per-site rule — if every hint misses, the generic path still runs.
- **Do not spoof the user agent.** LinkedIn serves zero JSON-LD to bot, Chrome,
  and Googlebot alike; this was measured, and spoofing gains nothing.
- **`lib/parser.ts` stays client-side.** The route returns text plus metadata;
  merging happens in `hooks/useParser.ts`, where the user's custom tags live.

### Unknown fields are blank, never a placeholder

When company or role cannot be determined, both `lib/parser.ts` and
`lib/extract/jsonld.ts` return `''` — not `'Unknown Company'` / `'Unknown Role'`.
The form then shows an empty required field, which the user notices, rather than
a plausible-looking wrong value, which they may not. Do not reintroduce sentinel
strings.

### Never render invented data

The same principle applies to the whole UI, not just parsed fields. If a number,
status, activity record or contact detail is not backed by real state, do not
render it. A review pass removed all of these, each of which had shipped:

- a "Weekly Goal" bar hardcoded to 60% against a target nothing tracked
- a "Recent Activity" row reading "Active now • Jakarta, ID" for sessions the
  app does not record — the city was invented
- an "Account verified" checklist item wired to nothing, always ticked
- an "Account Type: Professional" field, padlocked, for a tier that does not exist
- a "Point of Contact — Recruitment Team" card on job detail
- a support desk, company LinkedIn page, separate "DPO Office" and a 24-hour
  response SLA, none of which exist

Prefer showing less. Where a real figure exists, derive it (see the reminders
"Where things stand" tile). Where one doesn't, omit the element.

Related: **do not describe any feature as AI.** There is no model in this
project. The login page shipped "Instant AI Parsing" directly above copy
promising "no AI subscription required", and the add-job page claimed "Our AI
will automatically extract...". Both are gone; do not reintroduce them.

### A failed load is not an empty state

Every surface reading from `JobsProvider` must branch on `error` before it
branches on "no rows". Skipping it is not a missing nicety — the page asserts
something false. The reminders page told users "No stale applications — nice
work staying on top of things" whenever the fetch failed, and `StatsBar` scored
all four tiles "0" directly above the board's own "didn't load" message.

- **Use `components/ui/LoadFailure.tsx`** for a surface whose whole content
  failed. `as="h1"` when it replaces a page, the default `h2` inside a page that
  still renders its own heading.
- **Don't stack two error cards in one viewport.** `StatsBar` sits above the
  board, which already offers the retry, so its tiles render "—" and leave the
  affordance to the board.
- **Distinguish "failed to load" from "not found".** Job detail collapsed both
  into one bare "Job not found." line, which told a user whose connection had
  dropped that their application was gone.

### Optimistic writes roll back one row, never the whole array

`lib/jobs-state.ts` owns this. A snapshot of the entire array taken before a
request also predates every *other* mutation that lands while it is in flight,
so restoring it silently discards concurrent, already-confirmed changes — drag
card A, drag card B, A's PATCH fails, and B's confirmed move disappears from the
board until the next refresh. `revertJob` restores only the failed row and
`restoreJob` reinserts a failed delete at its original index. Covered by
`__tests__/lib/jobs-state.test.ts`.

Related: **the API's own validation copy is the user-facing message.** The
routes answer a rejected write with text that names the problem ("Description is
too long.", "Pick a source from the list."), and `writeJob` in `JobsProvider`
passes it through. `JobForm` shows `err.message`; it used to swallow every
failure into one generic "Could not save job. Try again.", leaving the user
nothing to act on. Only a dead connection and a non-JSON gateway reply — which
carry no such message — fall back to generic copy.

### Two modal primitives, on purpose

`ConfirmDialog` handles Tab as a swap between exactly two stops, Cancel and
Confirm. That is right for a fixed two-button confirm and structurally cannot
hold a dialog containing a field. Account deletion needs a typed confirmation,
so `DangerZone` builds on Base UI's dialog, which traps arbitrary content. Do
not "consolidate" these by adding a third stop to `ConfirmDialog`'s swap — that
means replacing it with a real focus trap, which is a change to every
destructive flow in the app. Base UI dialogs must set `initialFocus` at a real
control; the popup suppresses its own outline, so focus landing there is
invisible.

### Semantic colour tokens

Status colours (`--color-rejected`, `--color-offer`, …) are tuned for dots,
badges and borders. **They fail WCAG AA as body copy** — `--color-rejected` is
3.67:1 and `--color-offer` is 2.38:1. Use the dedicated text steps instead:

| Use as text | Token | Contrast on `--color-bg` |
|---|---|---|
| Errors, destructive labels | `--color-error-text` | 5.9:1 |
| Warnings, stale badges | `--color-warning-text` on `--color-warning-bg` | 6.7:1 |
| Success, confirmations | `--color-success-text` | 5.2:1 |

Measure against `--color-bg` (`#F8F7FF`), **not white** — the page background is
tinted, and the previous `#E11D48` cleared 4.5:1 on white while measuring 4.4:1
where it actually rendered.

### Accessibility baseline

Every interactive element gets the `focus-ring` utility and a 44px minimum
target. Do not use `focus:outline-none` with a low-opacity `ring-*`; it reads as
no focus indicator at all. Each page has exactly one `h1` with no skipped
levels — and check it survives at mobile widths, since a heading inside a
`hidden lg:flex` panel disappears below the breakpoint. Never signal state by
colour alone (see `MobileNav`, which pairs `aria-current` with a marker bar).
Modals follow `ConfirmDialog`: focus moves in on open, Escape closes, Tab is
trapped, focus returns to the opener.

### Interview Question Bank

`lib/interview-questions.ts` exports a map of tech tags → curated questions. When a job detail page loads, it reads the job's `tags` and pulls matching questions. No async call, no API, instant.

```ts
// lib/interview-questions.ts (structure)

export const questionBank: Record<string, InterviewQuestion[]> = {
  'React': [
    {
      question: 'Explain the difference between useMemo and useCallback.',
      category: 'technical',
      tip: 'Focus on what each memoizes — values vs functions — and when overuse hurts performance.'
    },
    // ... more
  ],
  'TypeScript': [ /* ... */ ],
  'Node.js':    [ /* ... */ ],
  // ... all tags
}

// Always include these regardless of tags
export const universalQuestions: InterviewQuestion[] = [
  {
    question: 'Tell me about a project you are most proud of.',
    category: 'behavioral',
    tip: 'Use STAR format. Pick something with a real challenge and measurable outcome.'
  },
  {
    question: 'How do you handle disagreements with teammates on technical decisions?',
    category: 'behavioral',
    tip: 'Show that you can advocate for your view while remaining collaborative.'
  },
  // ... 5-8 universal questions
]

export function getQuestionsForJob(tags: string[]): InterviewQuestion[] {
  const tagQuestions = tags.flatMap(tag => questionBank[tag] ?? [])
  return [...universalQuestions, ...tagQuestions]
}
```

---

## Coding Conventions

### General Rules

- **TypeScript strictly** — no `any`. Use proper types or generics.
- **Server Components by default** — only add `'use client'` when you need interactivity, hooks, or browser APIs.
- **Named exports** for components, **default exports** for pages.
- **No inline styles** — use Tailwind utility classes only. CSS variables for design tokens.
- **Error boundaries** — wrap async data-fetching sections in Suspense with a skeleton fallback.
- **No AI API calls** — if you find yourself reaching for `fetch('api.anthropic.com')` or installing `@anthropic-ai/sdk`, stop. Use `lib/parser.ts` and `lib/interview-questions.ts` instead.

### Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `JobCard.tsx` |
| Hooks | camelCase with `use` prefix | `useJobs.ts` |
| API routes | kebab-case folders | `/api/jobs/route.ts` |
| DB columns | snake_case | `last_updated` |
| TS types/interfaces | PascalCase | `JobStatus` |
| Tailwind classes | utility-first, mobile-first | `text-sm md:text-base` |

### Component Pattern

```tsx
interface Props {
  job: Job
  onStatusChange: (id: string, status: JobStatus) => void
}

export function JobCard({ job, onStatusChange }: Props) {
  // logic here
  return (
    // JSX here
  )
}
```

### API Route Pattern

```ts
// app/api/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // logic
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[jobs]', error)
    return NextResponse.json({ error: 'Failed to save job' }, { status: 500 })
  }
}
```

### Environment Variables

```bash
# .env.local — never commit

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> No `ANTHROPIC_API_KEY`. Do not add one.

### Commands

```bash
# Install
npm install

# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Unit tests (vitest) — lib/ is covered; run these after touching anything there
npx vitest run

# Build
npm run build

# Deploy (auto via Vercel Git integration)
git push origin main
```

---

## Behavioral Directives for Claude Code

### Code Generation Rules

- **Always check existing types** in `types/index.ts` before creating new ones. Extend, don't duplicate.
- **Always use the Supabase server client** (`lib/supabase/server.ts`) in API routes and Server Components. Use the browser client only in Client Components.
- **Never hardcode strings** that could be a constant — put status labels, categories, and column names in a `constants.ts` file.
- **Always handle loading and error states** — every async operation needs a loading UI and an error fallback.
- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** to the client. It only lives in server-side API routes.
- **Parser logic lives in `lib/parser.ts` only** — do not duplicate extraction logic inside components.

### Response Format Rules

- When generating a new file, output the **full file** — no placeholders like `// ... rest of component`.
- When editing an existing file, show only the **changed sections** with enough context (5 lines above/below).
- Always state **what you changed and why** in one sentence before the code block.
- If a task requires touching more than 3 files, **list all affected files first** before writing any code.

### Error Handling Standards

- User-facing errors must be **human-readable**. e.g. `"Couldn't extract job details. Fill in the fields manually below."`
- Log full errors server-side with a `[route-name]` prefix for easy grep.
- Parser failures must always fall back gracefully — pre-fill what was found, leave the rest blank for manual entry.

### Auth & Security Rules

Full detail in `docs/superpowers/specs/2026-07-03-jobtrackr-mvp-design.md` (Security section). Enforce these always:

- **Session via `@supabase/ssr` cookies only** — httpOnly, `Secure`, `SameSite=Lax`. Never store tokens in `localStorage`.
- **`proxy.ts` re-validates the session on every `(dashboard)` request** (Next 16 renamed `middleware.ts` → `proxy.ts`, function `proxy`) — never gate routes with client-only checks.
- **Email/password**: min 8 chars, Supabase leaked-password protection enabled, email verification required before dashboard access.
- **Google OAuth**: PKCE flow, exact redirect-URL allowlist (no wildcards) in both Supabase and Google Cloud Console, scopes limited to `email` + `profile`.
- **Generic auth error messages** — never reveal whether an email is registered. This includes the
  password-reset confirmation, which says "if that email has an account…" rather than confirming one.
- **`/callback` only redirects to same-origin paths.** The `next` parameter is validated in
  `safeNext()`: it must start with `/` and must not start with `//`. Without that, a crafted callback
  URL bounces a freshly authenticated user to an attacker's site.
- **Keep the proxy's protected-prefix list in sync with the `(dashboard)` group.** `/profile` was
  missing from it; the page's own server-side check meant it was never exposed, but the two lists
  must not drift.
- **RLS on `jobs`**: explicit `select`/`insert`/`update`/`delete` policies checking `auth.uid() = user_id`, not one blanket `for all` policy.
- **Validate and cap all API input server-side** (`/api/jobs`) — string length limits, `status` restricted to the 5 known enum values — even though RLS also scopes rows.
- **Never use `dangerouslySetInnerHTML`** on user-supplied text (JD paste, notes). Plain JSX interpolation only.
- **Never log secrets or full request bodies** — the `[route-name]` log prefix logs the error only.

### Scope Rules

- **Do not add features not listed in this file** unless the user explicitly asks in chat.
- **Do not install new packages** without flagging it first and explaining why the existing stack can't handle it.
- **Do not modify the DB schema** without first showing the migration SQL and getting confirmation.

### Kanban Drag-and-Drop

Design notes in `docs/superpowers/specs/2026-08-04-kanban-dnd-polish-design.md`.
Constraints that are easy to break by accident:

- **Never put a CSS `transition` on a draggable card.** dnd-kit rewrites the
  transform every pointer frame; any transition eases each rewrite and the card
  visibly trails the cursor. Use only the `transition` value `useSortable`
  returns, forced to `none` while `isDragging`.
- **Hover/active transforms must be gated on `:not([data-dragging])`.** A drag
  holds the pointer down over the card, so `:active` fires throughout.
- **Emit `data-dragging` only when true** (`isDragging || undefined`) —
  `data-dragging="false"` is still a present attribute and matches the selector.
- **The dragged card renders in `<DragOverlay>`**, not in place: the board is
  `overflow-x-auto` and would otherwise clip it mid-column-change.
- **Keep `TouchSensor`'s activation delay.** The whole card is the drag handle,
  so without a long-press the board cannot be scrolled on touch devices.
- **JS-driven animations must check `usePrefersReducedMotion`.** The global
  reduced-motion rule in `globals.css` only overrides `animation-duration` and
  `transition-duration`, so it cannot reach the Web Animations API (dnd-kit's
  drop animation) or Framer Motion. `PRODUCT.md` commits to motion restraint.

### Reminder Feature Implementation

Follow-up reminders are **in-app only**. Logic:

- **Thresholds are per-status**, in `STALE_THRESHOLDS` (`lib/constants.ts`): `applied` 7 days,
  `interview` 14, `offer` 7. A status absent from the map never goes stale — `saved` is a bookmark
  with nobody on the other side, `rejected` is terminal. Interview runs longer because scheduling
  genuinely takes a week or two; offer is short because an open offer is the most time-sensitive
  thing on the board.
- **`isStale(job)` in `lib/reminders.ts` is the only predicate.** `getStaleJobs`, the sidebar badge,
  the `/reminders` list and the board card's amber flag all call it, so no surface can disagree with
  another about which jobs qualify. Do not re-implement the comparison anywhere.
- **Always read the date through `getStaleReference` / `getStaleDays`.** Never compute a day count
  from `last_updated` directly at a call site. The reminders badge used to do exactly that while
  `getStaleJobs` filtered on `applied_at`, so any unrelated edit to a row made a job that had been
  silent for 45 days display "No update in 1 days". Regression tests cover this in
  `__tests__/lib/reminders.test.ts`.
- **Which clock `getStaleReference` uses depends on the status.** `applied` measures from
  `applied_at` (falling back to `last_updated`). Every other status measures from
  `status_changed_at` — when the job entered that stage.
- **`status_changed_at` is server-owned and only moves on a real transition.** The PATCH route
  stamps it in `app/api/jobs/[id]/route.ts`, gated on `b.status !== current?.status`, using the same
  DB read `applyRejectionBookkeeping` needs. It is deliberately **not** in `validatePatchInput`'s
  allowlist, so a client cannot backdate it to hide a job from its own reminders — verified.
  Neither of the other two dates works here: `applied_at` dates the application, so an interview
  scheduled yesterday read as six months silent; `last_updated` moves on *any* edit, so touching the
  notes on a quiet interview restarted its clock and it silently stopped being flagged. Optimistic
  updates in `JobsProvider` must set it alongside `status`, or a just-moved card flashes a stale
  flag until the server row lands. Regression tests cover all of this.
- Surface stale jobs as a badge count (or status dot when sidebar is collapsed) in the sidebar and a dedicated `/reminders` page.
- The check runs client-side on dashboard load — no cron job needed for MVP.

---

## MVP Scope Boundary

Build these. Nothing else until they work end-to-end.

- [x] Auth (login / logout / Google OAuth)
- [x] Password reset (request link → `/callback?next=` → `/update-password`)
- [x] Add job via JD paste (client-side parse)
- [x] Add job via posting URL (server fetch → JSON-LD / Open Graph / scoped text)
- [x] Add job manually (fallback form)
- [x] Kanban board with drag-and-drop
- [x] Job detail page
- [x] Interview prep panel (tag-matched questions from local bank)
- [x] Stale application reminder (in-app)
- [x] Responsive layout (mobile + desktop)
- [x] Deploy to Vercel with env vars configured
