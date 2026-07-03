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

1. **Smart JD parser** — paste raw job description text, client-side logic extracts company, role, salary, location, and tech tags using pattern matching
2. **Kanban pipeline** — drag-and-drop board: `Saved → Applied → Interview → Offer → Rejected`
3. **Interview prep** — curated question bank matched to detected tech tags (React, Node, SQL, etc.)
4. **Follow-up reminder** — flags applications with no status update after 7 days

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
│   │   │   └── page.tsx
│   │   └── callback/
│   │       └── route.ts
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
│   │   └── ReminderFlag.tsx
│   ├── prep/
│   │   ├── PrepPanel.tsx           # Shows matched questions
│   │   └── QuestionCard.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── MobileNav.tsx
│   └── ui/                         # shadcn auto-generated components
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   └── server.ts               # Server client (RSC / API routes)
│   ├── parser.ts                   # Client-side JD text parser (regex + heuristics)
│   ├── interview-questions.ts      # Curated question bank keyed by tech tag
│   ├── reminders.ts                # Stale job detection logic
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

create table jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  company      text not null,
  role         text not null,
  url          text,
  description  text,
  status       text default 'saved',        -- saved | applied | interview | offer | rejected
  salary_range text,
  location     text,
  tags         text[],                       -- e.g. ['React', 'Remote', 'Startup']
  notes        text,
  applied_at   timestamptz,
  last_updated timestamptz default now(),
  created_at   timestamptz default now()
);

-- RLS: users can only see their own data
alter table jobs enable row level security;

create policy "Users own their jobs"
  on jobs for all using (auth.uid() = user_id);
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
```

---

## Smart Parser — How It Works

No AI. All pattern matching in `lib/parser.ts`. Runs entirely in the browser.

```ts
// lib/parser.ts

export function parseJobDescription(text: string): ParsedJob {
  return {
    company:      extractCompany(text),
    role:         extractRole(text),
    salary_range: extractSalary(text),
    location:     extractLocation(text),
    tags:         extractTags(text),
    description:  text.trim(),
  }
}

// --- Extraction helpers ---

function extractRole(text: string): string {
  // Match common job title patterns in first 5 lines
  const lines = text.split('\n').slice(0, 5)
  const titlePatterns = [
    /(?:senior|junior|mid|lead|staff)?\s*(?:frontend|backend|fullstack|full.stack|software|web)\s*(?:engineer|developer|architect)/i,
    /(?:react|node|python|java)\s*developer/i,
  ]
  for (const line of lines) {
    for (const pattern of titlePatterns) {
      const match = line.match(pattern)
      if (match) return match[0].trim()
    }
  }
  return lines[0]?.trim() ?? 'Unknown Role'
}

function extractSalary(text: string): string | undefined {
  const match = text.match(/\$[\d,]+(?:k)?(?:\s*[-–]\s*\$?[\d,]+(?:k)?)?(?:\s*(?:\/yr|\/year|per year|annually))?/i)
  return match?.[0]
}

function extractLocation(text: string): string | undefined {
  const remoteMatch = text.match(/\b(remote|hybrid|on.?site|in.?office)\b/i)
  if (remoteMatch) return remoteMatch[0]
  const cityMatch = text.match(/\b([A-Z][a-z]+(?:,\s*[A-Z]{2})?)\b/)
  return cityMatch?.[0]
}

function extractCompany(text: string): string {
  const match = text.match(/(?:at|@|company[:\s]+|employer[:\s]+)\s*([A-Z][A-Za-z0-9\s&.,']+)/i)
  return match?.[1]?.trim() ?? 'Unknown Company'
}

function extractTags(text: string): string[] {
  const knownTags = [
    'React', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
    'Node.js', 'Express', 'Python', 'Django', 'FastAPI',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD',
    'GraphQL', 'REST', 'Tailwind', 'CSS', 'HTML',
    'Git', 'Agile', 'Scrum', 'Figma', 'Remote',
  ]
  return knownTags.filter(tag =>
    new RegExp(`\\b${tag.replace('.', '\\.')}\\b`, 'i').test(text)
  )
}
```

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
- **Generic auth error messages** — never reveal whether an email is registered.
- **RLS on `jobs`**: explicit `select`/`insert`/`update`/`delete` policies checking `auth.uid() = user_id`, not one blanket `for all` policy.
- **Validate and cap all API input server-side** (`/api/jobs`) — string length limits, `status` restricted to the 5 known enum values — even though RLS also scopes rows.
- **Never use `dangerouslySetInnerHTML`** on user-supplied text (JD paste, notes). Plain JSX interpolation only.
- **Never log secrets or full request bodies** — the `[route-name]` log prefix logs the error only.

### Scope Rules

- **Do not add features not listed in this file** unless the user explicitly asks in chat.
- **Do not install new packages** without flagging it first and explaining why the existing stack can't handle it.
- **Do not modify the DB schema** without first showing the migration SQL and getting confirmation.

### Reminder Feature Implementation

Follow-up reminders are **in-app only**. Logic:
- A job is "stale" if `status = 'applied'` AND `last_updated` is more than 7 days ago
- Surface stale jobs as a badge count in the sidebar and a dedicated `/reminders` page
- The check runs client-side on dashboard load — no cron job needed for MVP

---

## MVP Scope Boundary

Build these. Nothing else until they work end-to-end.

- [ ] Auth (login / logout / Google OAuth)
- [ ] Add job via JD paste (client-side parse)
- [ ] Add job manually (fallback form)
- [ ] Kanban board with drag-and-drop
- [ ] Job detail page
- [ ] Interview prep panel (tag-matched questions from local bank)
- [ ] Stale application reminder (in-app)
- [ ] Responsive layout (mobile + desktop)
- [ ] Deploy to Vercel with env vars configured
