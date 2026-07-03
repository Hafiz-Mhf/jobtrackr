# JobTrackr MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the JobTrackr MVP — auth, JD-paste + manual job entry, Kanban board, job detail with interview prep, stale-application reminders — end to end, deployed to Vercel.

**Architecture:** Next.js 16 App Router (Turbopack, React 19) with Supabase (Postgres + Auth via `@supabase/ssr`) as the only backend. All "smart" logic (JD parsing, interview questions, reminder detection) is client-side/pure-function — zero AI API calls. shadcn/ui + Tailwind v4 + Framer Motion for UI, `@dnd-kit` for the Kanban board.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui, @dnd-kit/core + @dnd-kit/sortable 6.x, Supabase JS client v2 + @supabase/ssr, Lucide React, Framer Motion 11, date-fns 3.

## Global Constraints

- No AI/LLM API package of any kind (no `@anthropic-ai/sdk`, no `fetch` to any AI API). Source: `CLAUDE.md`.
- TypeScript strict, no `any`. Source: `CLAUDE.md`.
- Server Components by default; `'use client'` only where interactivity/hooks/browser APIs are needed. Source: `CLAUDE.md`.
- Named exports for components, default exports for pages. Source: `CLAUDE.md`.
- No inline styles — Tailwind utilities + CSS vars only. Source: `CLAUDE.md`.
- Parser logic lives only in `lib/parser.ts`; interview-question logic only in `lib/interview-questions.ts`; reminder logic only in `lib/reminders.ts`. Source: `CLAUDE.md`.
- `SUPABASE_SERVICE_ROLE_KEY` never touches client code. Source: `CLAUDE.md`.
- Session cookies via `@supabase/ssr` only (httpOnly, `Secure`, `SameSite=Lax`) — never `localStorage`. Source: spec Security section.
- `proxy.ts` (Next 16's renamed `middleware.ts`, exported function `proxy`) re-validates session on every `(dashboard)` request. Source: spec Security section.
- RLS on `jobs`: explicit `select`/`insert`/`update`/`delete` policies checking `auth.uid() = user_id`, not one blanket policy. Source: spec Security section.
- API routes validate/cap input server-side (string length limits, `status` restricted to 5 known enum values) even though RLS also scopes rows. Source: spec Security section.
- No `dangerouslySetInnerHTML` on user-supplied text. Source: spec Security section.
- User-facing errors are human-readable; server errors logged with `[route-name]` prefix, no payload/secrets logged. Source: `CLAUDE.md`.
- Design tokens (colors, spacing, radius, type scale, aurora background) come verbatim from `design.md` — do not invent new values.
- No features beyond the 8-item MVP checklist in `CLAUDE.md`.

---

## File Structure

```
jobtrackr/
├── proxy.ts                              # Next 16 middleware replacement — session revalidation
├── tailwind.config.ts                    # Design tokens (Tailwind v4, @config compat mode)
├── app/
│   ├── globals.css                       # Font imports, CSS vars, aurora background, @config directive
│   ├── (auth)/
│   │   ├── login/page.tsx                # Email/password + Google OAuth sign-in/up form
│   │   └── callback/route.ts             # OAuth + email-verification callback handler
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Sidebar + Topbar shell, session guard
│   │   ├── dashboard/page.tsx            # Kanban board page
│   │   ├── jobs/
│   │   │   ├── page.tsx                  # Job list view
│   │   │   ├── new/page.tsx              # Add job (ParseInput + JobForm)
│   │   │   └── [id]/page.tsx             # Job detail + interview prep
│   │   └── reminders/page.tsx            # Flagged stale applications
│   └── api/
│       └── jobs/
│           ├── route.ts                  # GET (list), POST (create)
│           └── [id]/route.ts             # PATCH (update status/fields), DELETE
├── components/
│   ├── kanban/
│   │   ├── Board.tsx                     # DndContext, column layout, optimistic status update
│   │   ├── Column.tsx                    # Single status column + empty state
│   │   └── JobCard.tsx                   # Draggable job card
│   ├── jobs/
│   │   ├── JobForm.tsx                   # Manual entry form
│   │   ├── ParseInput.tsx                # JD paste → parse → staggered reveal
│   │   ├── StatusBadge.tsx               # Status pill
│   │   └── ReminderFlag.tsx              # Amber stale-warning row
│   ├── prep/
│   │   ├── PrepPanel.tsx                 # Slide-in panel, groups questions by category
│   │   └── QuestionCard.tsx              # Single question + tip
│   └── layout/
│       ├── Sidebar.tsx                   # Nav + reminder badge
│       ├── Topbar.tsx                    # Search + Add Job CTA
│       └── MobileNav.tsx                 # Bottom nav (<768px)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Browser client
│   │   └── server.ts                     # Server client (RSC / API routes / proxy.ts)
│   ├── parser.ts                         # JD text → ParsedJob
│   ├── interview-questions.ts            # Tag → questions map + universal set
│   ├── reminders.ts                      # Stale-job detection
│   ├── constants.ts                      # Status labels, columns, enum values
│   ├── animations.ts                     # Framer Motion variants (from design.md)
│   └── utils.ts                          # cn(), formatDate()
├── types/
│   └── index.ts                          # JobStatus, Job, ParsedJob, InterviewQuestion
├── hooks/
│   ├── useJobs.ts                        # Fetch/create/update/delete jobs client-side
│   ├── useParser.ts                      # Wraps parseJobDescription for ParseInput
│   └── useReminders.ts                   # Derives stale jobs from a Job[] list
├── supabase/
│   └── migrations/
│       └── 0001_init.sql                 # jobs table + RLS policies
└── __tests__/
    └── lib/
        ├── parser.test.ts
        └── reminders.test.ts
```

---

### Task 1: Scaffold Next.js 16 project + install dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.env.local` (from `.env.local.example`), `.gitignore`
- Create: `.env.local.example`

**Interfaces:**
- Produces: a runnable `npm run dev` Next.js 16 + TS + Tailwind v4 project other tasks build into.

- [ ] **Step 1: Scaffold the app**

```bash
npx create-next-app@latest jobtrackr --typescript --tailwind --app --src-dir=false --import-alias "@/*" --turbopack
cd jobtrackr
```

Answer prompts: ESLint = Yes.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities framer-motion date-fns lucide-react clsx tailwind-merge
```

- [ ] **Step 3: Install dev dependencies (testing)**

```bash
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 4: Add test script to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  }
}
```

- [ ] **Step 5: Create `.env.local.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Copy it to `.env.local` (gitignored) — values filled in once the Supabase project exists (Task 3).

- [ ] **Step 6: Verify dev server boots**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`, default Next.js page renders with no console errors. Stop the server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js 16 + Tailwind v4 project"
```

---

### Task 2: Design tokens — `globals.css` + `tailwind.config.ts`

**Files:**
- Modify: `app/globals.css`
- Create: `tailwind.config.ts`

**Interfaces:**
- Produces: CSS custom properties (`--color-accent`, `--radius-md`, etc.) and Tailwind theme extensions (`accent`, `surface`, `brand` colors, `card`/`card-hover`/`card-drag` shadows, `aurora-drift` animation) that every later component task uses.

- [ ] **Step 1: Write `tailwind.config.ts`** (verbatim from `design.md` Tailwind Config Additions section)

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#5B4EE8',
          light:   '#EEECFD',
          hover:   '#4A3ED4',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted:   '#F3F2FA',
        },
        brand: {
          bg:   '#F8F7FF',
          text: '#1A1835',
          muted:'#6B6893',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:   '0 1px 4px rgba(91, 78, 232, 0.08)',
        'card-hover': '0 4px 16px rgba(91, 78, 232, 0.12)',
        'card-drag':  '0 12px 40px rgba(91, 78, 232, 0.18)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      animation: {
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite alternate',
      },
      keyframes: {
        'aurora-drift': {
          '0%':   { transform: 'scale(1) translateX(0px) translateY(0px)' },
          '33%':  { transform: 'scale(1.04) translateX(20px) translateY(-10px)' },
          '66%':  { transform: 'scale(0.98) translateX(-15px) translateY(15px)' },
          '100%': { transform: 'scale(1.02) translateX(10px) translateY(-5px)' },
        }
      }
    }
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Write `app/globals.css`** (fonts, CSS vars, aurora background — verbatim values from `design.md`)

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";
@config "../tailwind.config.ts";

:root {
  --color-bg:            #F8F7FF;
  --color-surface:       #FFFFFF;
  --color-surface-muted: #F3F2FA;

  --color-accent:        #5B4EE8;
  --color-accent-light:  #EEECFD;
  --color-accent-hover:  #4A3ED4;

  --color-text-primary:  #1A1835;
  --color-text-secondary:#6B6893;
  --color-text-muted:    #A8A6C4;

  --color-saved:         #6B7280;
  --color-applied:       #3B82F6;
  --color-interview:     #8B5CF6;
  --color-offer:         #10B981;
  --color-rejected:      #F43F5E;

  --color-border:        #E8E6F5;
  --color-border-focus:  #5B4EE8;
  --color-shadow:        rgba(91, 78, 232, 0.08);

  --aurora-1: rgba(91, 78, 232, 0.04);
  --aurora-2: rgba(139, 92, 246, 0.03);
  --aurora-3: rgba(56, 189, 248, 0.03);

  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --sidebar-width: 240px;
  --topbar-height: 60px;
  --content-max: 1200px;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  position: relative;
  overflow-x: hidden;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%, var(--aurora-1), transparent),
    radial-gradient(ellipse 60% 80% at 80% 90%, var(--aurora-2), transparent),
    radial-gradient(ellipse 70% 50% at 50% 50%, var(--aurora-3), transparent);
  animation: aurora-drift 18s ease-in-out infinite alternate;
  pointer-events: none;
}

#__next, main, aside, header {
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: Verify it renders**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: warm-white background with a barely-visible slow gradient shift, no CSS errors in console.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css tailwind.config.ts
git commit -m "feat: add design token system and aurora background"
```

---

### Task 3: Supabase project — schema, RLS, env vars

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Modify: `.env.local` (not committed)

**Interfaces:**
- Produces: `jobs` table with columns matching `types/index.ts`'s `Job` interface (Task 4), scoped by per-operation RLS policies.

- [ ] **Step 1: Write the migration SQL** (split policies per spec Security section, not one blanket `for all`)

```sql
-- supabase/migrations/0001_init.sql

create table jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  company      text not null,
  role         text not null,
  url          text,
  description  text,
  status       text not null default 'saved' check (status in ('saved','applied','interview','offer','rejected')),
  salary_range text,
  location     text,
  tags         text[] not null default '{}',
  notes        text,
  applied_at   timestamptz,
  last_updated timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table jobs enable row level security;

create policy "Users can select their own jobs"
  on jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own jobs"
  on jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own jobs"
  on jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own jobs"
  on jobs for delete
  using (auth.uid() = user_id);

create index jobs_user_id_idx on jobs (user_id);
create index jobs_status_idx on jobs (status);
```

- [ ] **Step 2: Create the Supabase project and apply the migration**

Create a new project at supabase.com (or via the Supabase MCP `create_project` tool). Then run the SQL in Step 1 via the SQL editor or `apply_migration`.

- [ ] **Step 3: Enable Google OAuth + leaked-password protection**

In Supabase Dashboard → Authentication → Providers: enable Google, set Client ID/Secret from Google Cloud Console, restrict Authorized redirect URI to `<NEXT_PUBLIC_APP_URL>/callback` exactly (no wildcards) in both Supabase and Google Cloud Console.
In Authentication → Policies: enable "leaked password protection" (HaveIBeenPwned check) and require email confirmation for new sign-ups.

- [ ] **Step 4: Fill in `.env.local`**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 5: Verify RLS**

Run in Supabase SQL editor: `select * from jobs;` while impersonating an anon role (no `auth.uid()`).
Expected: 0 rows, no error (RLS blocks access silently rather than erroring).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: add jobs table schema with per-operation RLS policies"
```

---

### Task 4: Shared types + constants

**Files:**
- Create: `types/index.ts`
- Create: `lib/constants.ts`

**Interfaces:**
- Produces: `JobStatus`, `Job`, `ParsedJob`, `InterviewQuestion` types (consumed by every later task) and `JOB_STATUSES`, `STATUS_LABELS`, `KNOWN_TAGS` constants (consumed by parser, Kanban, API routes).

- [ ] **Step 1: Write `types/index.ts`** (verbatim from `CLAUDE.md`)

```ts
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

- [ ] **Step 2: Write `lib/constants.ts`**

```ts
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/constants.ts
git commit -m "feat: add shared types and constants"
```

---

### Task 5: Supabase client helpers

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars.
- Produces: `createClient()` (browser) and `createServerClient()` (RSC/API routes/`proxy.ts`) — every later data-access task uses these, never raw `@supabase/supabase-js`.

- [ ] **Step 1: Write `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Write `lib/supabase/server.ts`**

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as CookieOptions)
            })
          } catch {
            // called from a Server Component without a writable cookie store — proxy.ts refreshes the session instead
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: add Supabase browser and server client helpers"
```

---

### Task 6: `proxy.ts` — session revalidation

**Files:**
- Create: `proxy.ts` (project root)
- Create: `lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: `lib/supabase/server.ts` cookie pattern (adapted for the proxy request/response pair).
- Produces: every request to `(dashboard)/*` has a validated session or is redirected to `/login`.

- [ ] **Step 1: Write `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/jobs') ||
    request.nextUrl.pathname.startsWith('/reminders')

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}
```

- [ ] **Step 2: Write `proxy.ts`**

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 3: Verify redirect behavior**

Run: `npm run dev`, visit `http://localhost:3000/dashboard` with no session.
Expected: redirected to `/login` (login page doesn't exist yet — a 404 there is fine for now, confirming the redirect itself is the thing under test; re-verify fully once Task 7 adds the page).

- [ ] **Step 4: Commit**

```bash
git add proxy.ts lib/supabase/middleware.ts
git commit -m "feat: add proxy.ts session revalidation for dashboard routes"
```

---

### Task 7: Login page — email/password + Google OAuth

**Files:**
- Create: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/client.ts`.
- Produces: working sign-in/sign-up form; on success, browser holds a session cookie set by `@supabase/ssr`.

- [ ] **Step 1: Write `app/(auth)/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    if (mode === 'sign-up') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/callback` },
      })
      setLoading(false)
      if (error) {
        setError('Could not create account. Try a different email or password.')
        return
      }
      setInfo('Check your email to confirm your account before signing in.')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Invalid email or password.')
      return
    }
    window.location.href = '/dashboard'
  }

  async function handleGoogleAuth() {
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/callback` },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm bg-surface border border-[var(--color-border)] rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-brand-text mb-1">
          Your job search, actually organized.
        </h1>
        <p className="text-sm text-brand-muted mb-6">
          {mode === 'sign-in' ? 'Sign in to continue' : 'Create your account'}
        </p>

        <button
          type="button"
          onClick={handleGoogleAuth}
          className="w-full border border-[var(--color-border)] rounded-md py-2 text-sm font-medium mb-4"
        >
          Continue with Google
        </button>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-[var(--color-rejected)]">{error}</p>}
          {info && <p className="text-sm text-[var(--color-offer)]">{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white rounded-md py-2 text-sm font-semibold disabled:opacity-60"
          >
            {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          className="w-full text-center text-sm text-brand-muted mt-4"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, visit `/login`, sign up with a test email/password.
Expected: "Check your email to confirm your account" message appears, no console errors, no session cookie set yet (unconfirmed).

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat: add login page with email/password and Google OAuth"
```

---

### Task 8: OAuth + email-verification callback

**Files:**
- Create: `app/(auth)/callback/route.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts`.
- Produces: exchanges the auth code for a session, then redirects to `/dashboard` (or `/login` with a generic error on failure).

- [ ] **Step 1: Write `app/(auth)/callback/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`)
    }
    console.error('[callback]', error)
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}
```

- [ ] **Step 2: Verify manually**

Confirm a sign-up email (or complete Google OAuth) and follow the link.
Expected: redirected to `/dashboard` with a valid session cookie set.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/callback/route.ts"
git commit -m "feat: add auth callback route for OAuth and email confirmation"
```

---

### Task 9: Dashboard layout shell — Sidebar, Topbar, MobileNav

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/Topbar.tsx`
- Create: `components/layout/MobileNav.tsx`
- Create: `app/(dashboard)/layout.tsx`
- Create: `lib/utils.ts`

**Interfaces:**
- Consumes: `STATUS_LABELS`/`JOB_STATUSES` are not needed here; consumes `createClient()` (server) to fetch the user for the layout, and `useReminders` badge count is stubbed with `0` until Task 26 wires the real hook (documented inline as the integration point).
- Produces: `(dashboard)/*` pages render inside a Sidebar + Topbar shell. Exports `cn()` used by every component task from here on.

- [ ] **Step 1: Write `lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string) {
  return format(new Date(iso), 'MMM d, yyyy')
}
```

- [ ] **Step 2: Write `components/layout/Sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, List, Plus, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  reminderCount: number
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/jobs', label: 'All Jobs', icon: List },
  { href: '/jobs/new', label: 'Add Job', icon: Plus },
]

export function Sidebar({ reminderCount }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-[var(--sidebar-width)] h-screen bg-surface-muted border-r border-[var(--color-border)] p-4 flex flex-col gap-2">
      <div className="px-2 py-3 font-semibold text-accent">JobTrackr</div>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-brand-muted hover:bg-accent-light hover:text-accent transition-colors',
            pathname === href && 'bg-accent-light text-accent font-semibold'
          )}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
      <Link
        href="/reminders"
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-brand-muted hover:bg-accent-light hover:text-accent transition-colors',
          pathname === '/reminders' && 'bg-accent-light text-accent font-semibold'
        )}
      >
        <Bell size={16} />
        Reminders
        {reminderCount > 0 && (
          <span className="ml-auto bg-[var(--color-rejected)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {reminderCount}
          </span>
        )}
      </Link>
    </aside>
  )
}
```

- [ ] **Step 3: Write `components/layout/Topbar.tsx`**

```tsx
import Link from 'next/link'

export function Topbar() {
  return (
    <header className="h-[var(--topbar-height)] border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-surface">
      <input
        type="search"
        placeholder="Search jobs..."
        className="text-sm border border-[var(--color-border)] rounded-md px-3 py-1.5 w-64"
      />
      <Link
        href="/jobs/new"
        className="bg-accent text-white text-sm font-semibold px-4 py-1.5 rounded-md"
      >
        Add Job
      </Link>
    </header>
  )
}
```

- [ ] **Step 4: Write `components/layout/MobileNav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, List, Plus, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Board' },
  { href: '/jobs', icon: List, label: 'Jobs' },
  { href: '/jobs/new', icon: Plus, label: 'Add' },
  { href: '/reminders', icon: Bell, label: 'Alerts' },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-surface border-t border-[var(--color-border)] flex items-center justify-around z-10">
      {ITEMS.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex flex-col items-center gap-0.5 text-[10px] text-brand-muted',
            pathname === href && 'text-accent'
          )}
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 5: Write `app/(dashboard)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // reminderCount hardcoded to 0 here; Task 26 replaces this with useReminders() output
  // fed down from a client wrapper once jobs data-fetching (Task 17) exists.
  const reminderCount = 0

  return (
    <div className="flex">
      <div className="hidden md:block">
        <Sidebar reminderCount={reminderCount} />
      </div>
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
```

- [ ] **Step 6: Verify manually**

Sign in, visit `/dashboard` (page doesn't exist yet — confirm the shell renders around a 404, or stub a placeholder `app/(dashboard)/dashboard/page.tsx` returning `<div>Board</div>` temporarily to check layout renders correctly, then leave it — Task 19 replaces it).
Expected: sidebar + topbar render, aurora background visible behind content.

- [ ] **Step 7: Commit**

```bash
git add lib/utils.ts components/layout "app/(dashboard)/layout.tsx"
git commit -m "feat: add dashboard layout shell with sidebar, topbar, mobile nav"
```

---

### Task 10: `lib/parser.ts` with unit tests (TDD)

**Files:**
- Create: `lib/parser.ts`
- Test: `__tests__/lib/parser.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: `ParsedJob` type from `types/index.ts`, `KNOWN_TAGS` from `lib/constants.ts`.
- Produces: `parseJobDescription(text: string): ParsedJob` — consumed by `ParseInput.tsx` (Task 11) and `hooks/useParser.ts`.

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 2: Write the failing tests**

```ts
// __tests__/lib/parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseJobDescription } from '@/lib/parser'

describe('parseJobDescription', () => {
  it('extracts company from "at <Company>" pattern', () => {
    const result = parseJobDescription('Senior Frontend Engineer at Stripe\nWe are looking for...')
    expect(result.company).toBe('Stripe')
  })

  it('extracts a known role title pattern', () => {
    const result = parseJobDescription('Senior Frontend Engineer at Stripe\nWe are looking for...')
    expect(result.role.toLowerCase()).toContain('frontend engineer')
  })

  it('falls back to the first line when no role pattern matches', () => {
    const result = parseJobDescription('Widget Wrangler III\nJoin our team...')
    expect(result.role).toBe('Widget Wrangler III')
  })

  it('extracts a salary range with $ and k suffix', () => {
    const result = parseJobDescription('Pay: $130k - $160k per year')
    expect(result.salary_range).toContain('130k')
  })

  it('returns undefined salary when none present', () => {
    const result = parseJobDescription('No compensation info here.')
    expect(result.salary_range).toBeUndefined()
  })

  it('extracts "Remote" as location', () => {
    const result = parseJobDescription('This role is fully Remote.')
    expect(result.location).toBe('Remote')
  })

  it('extracts known tech tags case-insensitively', () => {
    const result = parseJobDescription('Must know react, TypeScript and Node.js well.')
    expect(result.tags).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Node.js']))
  })

  it('does not match partial words for tags', () => {
    const result = parseJobDescription('We use Reactive Streams internally.')
    expect(result.tags).not.toContain('React')
  })

  it('preserves the original trimmed text as description', () => {
    const result = parseJobDescription('  Some JD text.  ')
    expect(result.description).toBe('Some JD text.')
  })

  it('defaults company to Unknown Company when no match', () => {
    const result = parseJobDescription('Just some text with no company marker.')
    expect(result.company).toBe('Unknown Company')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/parser.test.ts`
Expected: FAIL — `Cannot find module '@/lib/parser'`.

- [ ] **Step 4: Write `lib/parser.ts`** (verbatim logic from `CLAUDE.md`, using `KNOWN_TAGS` from constants)

```ts
import type { ParsedJob } from '@/types'
import { KNOWN_TAGS } from '@/lib/constants'

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

function extractRole(text: string): string {
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
  return KNOWN_TAGS.filter(tag =>
    new RegExp(`\\b${tag.replace('.', '\\.')}\\b`, 'i').test(text)
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/parser.test.ts`
Expected: all 10 tests PASS. If the "Widget Wrangler III" fallback test fails because `extractCompany`/`extractLocation` regex greedily matches something unintended, adjust only the failing extractor, not the test.

- [ ] **Step 6: Commit**

```bash
git add lib/parser.ts __tests__/lib/parser.test.ts vitest.config.ts package.json
git commit -m "feat: add client-side JD parser with unit tests"
```

---

### Task 11: `ParseInput.tsx` + `lib/animations.ts`

**Files:**
- Create: `lib/animations.ts`
- Create: `hooks/useParser.ts`
- Create: `components/jobs/ParseInput.tsx`

**Interfaces:**
- Consumes: `parseJobDescription()` from Task 10, `ParsedJob` type.
- Produces: `onParsed: (parsed: ParsedJob) => void` callback prop — consumed by `jobs/new/page.tsx` (Task 19) to hand parsed fields to `JobForm`.

- [ ] **Step 1: Write `lib/animations.ts`** (verbatim from `design.md`)

```ts
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } }
}

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

export const stagger = (delay = 0.06) => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } }
})

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } }
}

export const slideFromRight = {
  hidden:   { x: '100%', opacity: 0 },
  visible:  { x: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit:     { x: '100%', opacity: 0, transition: { duration: 0.2 } }
}

export const slideFromBottom = {
  hidden:   { y: 24, opacity: 0 },
  visible:  { y: 0, opacity: 1, transition: { type: 'spring', damping: 20, stiffness: 260 } },
  exit:     { y: 24, opacity: 0, transition: { duration: 0.15 } }
}
```

- [ ] **Step 2: Write `hooks/useParser.ts`**

```ts
'use client'

import { useState } from 'react'
import { parseJobDescription } from '@/lib/parser'
import type { ParsedJob } from '@/types'

export function useParser() {
  const [result, setResult] = useState<ParsedJob | null>(null)

  function parse(text: string) {
    if (!text.trim()) {
      setResult(null)
      return null
    }
    const parsed = parseJobDescription(text)
    setResult(parsed)
    return parsed
  }

  function reset() {
    setResult(null)
  }

  return { result, parse, reset }
}
```

- [ ] **Step 3: Write `components/jobs/ParseInput.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useParser } from '@/hooks/useParser'
import { stagger, fadeUp } from '@/lib/animations'
import type { ParsedJob } from '@/types'

interface Props {
  onParsed: (parsed: ParsedJob) => void
  onManual: () => void
}

export function ParseInput({ onParsed, onManual }: Props) {
  const [text, setText] = useState('')
  const { result, parse } = useParser()

  function handleExtract() {
    const parsed = parse(text)
    if (parsed) onParsed(parsed)
  }

  const fields = result
    ? [
        result.company,
        result.role,
        [result.salary_range, result.location].filter(Boolean).join(' · '),
        result.tags.join(', '),
      ].filter(Boolean)
    : []

  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-3">Paste a job description</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="Senior Frontend Engineer at Stripe..."
        className="w-full border border-[var(--color-border)] rounded-md p-3 text-sm font-mono"
      />
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={handleExtract}
          disabled={!text.trim()}
          className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
        >
          Extract Details
        </button>
        <button type="button" onClick={onManual} className="text-sm text-brand-muted underline">
          Fill manually
        </button>
      </div>

      {result && (
        <motion.div initial="hidden" animate="visible" variants={stagger()} className="mt-6 border-t border-[var(--color-border)] pt-4 space-y-1">
          {fields.length === 0 && (
            <p className="text-sm text-[var(--color-saved)]">
              Couldn&apos;t extract details. Fill in the fields manually below.
            </p>
          )}
          {fields.map((field, i) => (
            <motion.p key={i} variants={fadeUp} className="text-sm">
              ✓ {field}
            </motion.p>
          ))}
        </motion.div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify manually**

Stub a temporary page importing `ParseInput` (or wait for Task 19), paste a sample JD, click "Extract Details".
Expected: staggered fade-up of extracted fields, no console errors.

- [ ] **Step 5: Commit**

```bash
git add lib/animations.ts hooks/useParser.ts components/jobs/ParseInput.tsx
git commit -m "feat: add ParseInput component with staggered reveal"
```

---

### Task 12: `JobForm.tsx` — manual entry / review-and-edit

**Files:**
- Create: `components/jobs/JobForm.tsx`

**Interfaces:**
- Consumes: `Job`/`ParsedJob`/`JobStatus` types, `JOB_STATUSES` and `STATUS_LABELS` from `lib/constants.ts`.
- Produces: `onSubmit: (values: JobFormValues) => Promise<void>` — consumed by `jobs/new/page.tsx` (Task 19) and `jobs/[id]/page.tsx` (Task 22, edit mode).

- [ ] **Step 1: Write `components/jobs/JobForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { Job, JobStatus, ParsedJob } from '@/types'
import { JOB_STATUSES, STATUS_LABELS } from '@/lib/constants'

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

export function JobForm({ initial, onSubmit, submitLabel = 'Save job' }: Props) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Company *</label>
          <input
            value={values.company}
            onChange={(e) => set('company', e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Role *</label>
          <input
            value={values.role}
            onChange={(e) => set('role', e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Salary range</label>
          <input
            value={values.salary_range}
            onChange={(e) => set('salary_range', e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Location</label>
          <input
            value={values.location}
            onChange={(e) => set('location', e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Job URL</label>
        <input
          value={values.url}
          onChange={(e) => set('url', e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Tags (comma-separated)</label>
        <input
          value={values.tags}
          onChange={(e) => set('tags', e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1 font-mono"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Status</label>
        <select
          value={values.status}
          onChange={(e) => set('status', e.target.value as JobStatus)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm mt-1"
        />
      </div>

      {error && <p className="text-sm text-[var(--color-rejected)]">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-60"
      >
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/jobs/JobForm.tsx
git commit -m "feat: add JobForm for manual entry and edit"
```

---

### Task 13: `/api/jobs` route — list + create, with server-side validation

**Files:**
- Create: `app/api/jobs/route.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts`, `JOB_STATUSES`/`MAX_FIELD_LENGTH`/`MAX_TEXT_LENGTH` from `lib/constants.ts`.
- Produces: `GET /api/jobs` → `{ data: Job[] }`; `POST /api/jobs` → `{ data: Job }` or `{ error: string }` (400/401/500) — consumed by `hooks/useJobs.ts` (Task 14).

- [ ] **Step 1: Write `app/api/jobs/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JOB_STATUSES, MAX_FIELD_LENGTH, MAX_TEXT_LENGTH } from '@/lib/constants'

function validateJobInput(body: unknown): { valid: true; data: Record<string, unknown> } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  if (typeof b.company !== 'string' || !b.company.trim() || b.company.length > MAX_FIELD_LENGTH) {
    return { valid: false, error: 'Company is required and must be under 200 characters.' }
  }
  if (typeof b.role !== 'string' || !b.role.trim() || b.role.length > MAX_FIELD_LENGTH) {
    return { valid: false, error: 'Role is required and must be under 200 characters.' }
  }
  if (b.status !== undefined && !JOB_STATUSES.includes(b.status as never)) {
    return { valid: false, error: 'Invalid status value.' }
  }
  if (typeof b.description === 'string' && b.description.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: 'Description is too long.' }
  }
  if (typeof b.notes === 'string' && b.notes.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: 'Notes are too long.' }
  }

  return { valid: true, data: b }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[jobs]', error)
      return NextResponse.json({ error: 'Failed to load jobs.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[jobs]', error)
    return NextResponse.json({ error: 'Failed to load jobs.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const body = await req.json()
    const validation = validateJobInput(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({ ...validation.data, user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('[jobs]', error)
      return NextResponse.json({ error: 'Failed to save job.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[jobs]', error)
    return NextResponse.json({ error: 'Failed to save job.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify manually**

With a signed-in session, `POST` a valid job via the browser dev tools console (`fetch('/api/jobs', { method: 'POST', body: JSON.stringify({ company: 'Acme', role: 'Engineer' }), headers: { 'Content-Type': 'application/json' } })`).
Expected: `200` with the inserted row (including `id`, `user_id`). A `POST` with `company` omitted returns `400` with a readable error.

- [ ] **Step 3: Commit**

```bash
git add app/api/jobs/route.ts
git commit -m "feat: add jobs list/create API route with server-side validation"
```

---

### Task 14: `/api/jobs/[id]` route — update + delete

**Files:**
- Create: `app/api/jobs/[id]/route.ts`

**Interfaces:**
- Consumes: same validation helper pattern as Task 13.
- Produces: `PATCH /api/jobs/:id` → `{ data: Job }`; `DELETE /api/jobs/:id` → `{ data: { id: string } }` — consumed by `hooks/useJobs.ts` (Task 15) for status updates (Kanban drag) and job detail edits.

- [ ] **Step 1: Write `app/api/jobs/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JOB_STATUSES, MAX_FIELD_LENGTH, MAX_TEXT_LENGTH } from '@/lib/constants'

function validatePatchInput(body: unknown): { valid: true; data: Record<string, unknown> } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  if (b.company !== undefined && (typeof b.company !== 'string' || b.company.length > MAX_FIELD_LENGTH)) {
    return { valid: false, error: 'Company must be under 200 characters.' }
  }
  if (b.role !== undefined && (typeof b.role !== 'string' || b.role.length > MAX_FIELD_LENGTH)) {
    return { valid: false, error: 'Role must be under 200 characters.' }
  }
  if (b.status !== undefined && !JOB_STATUSES.includes(b.status as never)) {
    return { valid: false, error: 'Invalid status value.' }
  }
  if (b.notes !== undefined && typeof b.notes === 'string' && b.notes.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: 'Notes are too long.' }
  }

  return { valid: true, data: { ...b, last_updated: new Date().toISOString() } }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const body = await req.json()
    const validation = validatePatchInput(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(validation.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[jobs/id]', error)
      return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[jobs/id]', error)
    return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[jobs/id]', error)
      return NextResponse.json({ error: 'Failed to delete job.' }, { status: 500 })
    }

    return NextResponse.json({ data: { id } })
  } catch (error) {
    console.error('[jobs/id]', error)
    return NextResponse.json({ error: 'Failed to delete job.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify manually**

`PATCH` a known job id with `{ "status": "applied" }`.
Expected: `200`, returned row has updated `status` and a fresh `last_updated`. `PATCH` with `{ "status": "bogus" }` returns `400`.

- [ ] **Step 3: Commit**

```bash
git add "app/api/jobs/[id]/route.ts"
git commit -m "feat: add job update/delete API route"
```

---

### Task 15: `hooks/useJobs.ts`

**Files:**
- Create: `hooks/useJobs.ts`

**Interfaces:**
- Consumes: `/api/jobs` and `/api/jobs/[id]` routes (Tasks 13-14), `Job`/`JobStatus` types.
- Produces: `{ jobs, loading, error, createJob, updateJobStatus, updateJob, deleteJob, refresh }` — consumed by `Board.tsx` (Task 17), `jobs/page.tsx`, `jobs/new/page.tsx`, `jobs/[id]/page.tsx`.

- [ ] **Step 1: Write `hooks/useJobs.ts`**

```ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Job, JobStatus } from '@/types'
import type { JobFormValues } from '@/components/jobs/JobForm'

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setJobs(json.data)
    } catch {
      setError("Couldn't load jobs. Try refreshing the page.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function createJob(values: Partial<JobFormValues>): Promise<Job> {
    const payload = {
      ...values,
      tags: typeof values.tags === 'string'
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : values.tags,
    }
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setJobs((prev) => [json.data, ...prev])
    return json.data
  }

  async function updateJobStatus(id: string, status: JobStatus) {
    const previous = jobs
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)))
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      setJobs(previous)
      throw new Error("Couldn't update status.")
    }
  }

  async function updateJob(id: string, values: Partial<JobFormValues>) {
    const payload = {
      ...values,
      tags: typeof values.tags === 'string'
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : values.tags,
    }
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setJobs((prev) => prev.map((j) => (j.id === id ? json.data : j)))
    return json.data as Job
  }

  async function deleteJob(id: string) {
    const previous = jobs
    setJobs((prev) => prev.filter((j) => j.id !== id))
    const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setJobs(previous)
      throw new Error("Couldn't delete job.")
    }
  }

  return { jobs, loading, error, createJob, updateJobStatus, updateJob, deleteJob, refresh }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useJobs.ts
git commit -m "feat: add useJobs hook for CRUD against /api/jobs"
```

---

### Task 16: `StatusBadge.tsx`

**Files:**
- Create: `components/jobs/StatusBadge.tsx`

**Interfaces:**
- Consumes: `JobStatus` type, `STATUS_LABELS` from `lib/constants.ts`.
- Produces: `<StatusBadge status={job.status} />` — consumed by `JobCard.tsx` (Task 18) and `jobs/[id]/page.tsx` (Task 22).

- [ ] **Step 1: Write `components/jobs/StatusBadge.tsx`**

```tsx
import type { JobStatus } from '@/types'
import { STATUS_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const STYLES: Record<JobStatus, string> = {
  saved:     'text-[var(--color-saved)] bg-[#F3F4F6]',
  applied:   'text-[var(--color-applied)] bg-[#EFF6FF]',
  interview: 'text-[var(--color-interview)] bg-[#F5F3FF]',
  offer:     'text-[var(--color-offer)] bg-[#ECFDF5]',
  rejected:  'text-[var(--color-rejected)] bg-[#FFF1F2]',
}

interface Props {
  status: JobStatus
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
        STYLES[status]
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/jobs/StatusBadge.tsx
git commit -m "feat: add StatusBadge component"
```

---

### Task 17: Kanban board — `Board.tsx`, `Column.tsx`, `JobCard.tsx`

**Files:**
- Create: `components/kanban/JobCard.tsx`
- Create: `components/kanban/Column.tsx`
- Create: `components/kanban/Board.tsx`

**Interfaces:**
- Consumes: `useJobs()` (Task 15), `StatusBadge` (Task 16), `JOB_STATUSES`/`STATUS_LABELS` (`lib/constants.ts`), `formatDate()` (`lib/utils.ts`).
- Produces: `<Board />` — a self-contained component consumed by `app/(dashboard)/dashboard/page.tsx` (Task 19).

- [ ] **Step 1: Write `components/kanban/JobCard.tsx`**

```tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import type { Job } from '@/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  job: Job
}

export function JobCard({ job }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-dragging={isDragging}
      className={cn(
        'bg-surface border border-[var(--color-border)] rounded-md p-4 mb-3 cursor-grab shadow-card hover:shadow-card-hover hover:-translate-y-px transition-shadow',
        isDragging && 'shadow-card-drag rotate-1 scale-[1.02] border-accent'
      )}
    >
      <Link href={`/jobs/${job.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <p className="text-base font-semibold text-brand-text">{job.company}</p>
        <p className="text-sm text-brand-muted mt-0.5">{job.role}</p>
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="font-mono text-xs px-2 py-0.5 rounded-full bg-accent-light text-accent font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)] text-xs text-brand-muted font-mono">
          {formatDate(job.last_updated)}
        </div>
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Write `components/kanban/Column.tsx`**

```tsx
'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Job, JobStatus } from '@/types'
import { STATUS_LABELS } from '@/lib/constants'
import { JobCard } from './JobCard'

interface Props {
  status: JobStatus
  jobs: Job[]
}

export function Column({ status, jobs }: Props) {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div ref={setNodeRef} className="min-w-[280px] max-w-[300px] bg-surface-muted border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 text-sm font-semibold text-brand-muted uppercase tracking-wide">
        <span>{STATUS_LABELS[status]}</span>
        <span>({jobs.length})</span>
      </div>
      <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
        {jobs.length === 0 && (
          <div className="border border-dashed border-[var(--color-border)] rounded-md p-4 text-center text-xs text-brand-muted">
            No applications here yet
          </div>
        )}
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </SortableContext>
    </div>
  )
}
```

- [ ] **Step 3: Write `components/kanban/Board.tsx`**

```tsx
'use client'

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useJobs } from '@/hooks/useJobs'
import { JOB_STATUSES } from '@/lib/constants'
import type { JobStatus } from '@/types'
import { Column } from './Column'

export function Board() {
  const { jobs, loading, error, updateJobStatus } = useJobs()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const jobId = active.id as string
    const targetStatus = over.id as JobStatus
    const job = jobs.find((j) => j.id === jobId)
    if (!job || job.status === targetStatus || !JOB_STATUSES.includes(targetStatus)) return

    updateJobStatus(jobId, targetStatus).catch(() => {
      // useJobs already reverts optimistic state on failure; surface via toast in Task 27
    })
  }

  if (loading) {
    return <div className="p-6 text-sm text-brand-muted">Loading board...</div>
  }

  if (error) {
    return <div className="p-6 text-sm text-[var(--color-rejected)]">{error}</div>
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-6 overflow-x-auto items-start min-h-[calc(100vh-var(--topbar-height))]">
        {JOB_STATUSES.map((status) => (
          <Column key={status} status={status} jobs={jobs.filter((j) => j.status === status)} />
        ))}
      </div>
    </DndContext>
  )
}
```

- [ ] **Step 4: Verify manually**

Wire `<Board />` into `app/(dashboard)/dashboard/page.tsx` temporarily (Task 19 finalizes this), sign in, add a job via `POST` (Task 13's manual test), reload.
Expected: job card appears in "Saved" column; dragging it to "Applied" moves it and persists across reload.

- [ ] **Step 5: Commit**

```bash
git add components/kanban
git commit -m "feat: add Kanban board with dnd-kit drag-and-drop"
```

---

### Task 18: Wire dashboard, jobs list, and add-job pages

**Files:**
- Create: `app/(dashboard)/dashboard/page.tsx`
- Create: `app/(dashboard)/jobs/page.tsx`
- Create: `app/(dashboard)/jobs/new/page.tsx`

**Interfaces:**
- Consumes: `Board` (Task 17), `ParseInput` (Task 11), `JobForm` (Task 12), `useJobs` (Task 15), `StatusBadge` (Task 16).
- Produces: the three route pages the MVP checklist's "Kanban board" and "Add job" items require.

- [ ] **Step 1: Write `app/(dashboard)/dashboard/page.tsx`**

```tsx
import { Board } from '@/components/kanban/Board'

export default function DashboardPage() {
  return <Board />
}
```

- [ ] **Step 2: Write `app/(dashboard)/jobs/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useJobs } from '@/hooks/useJobs'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { formatDate } from '@/lib/utils'

export default function JobsListPage() {
  const { jobs, loading, error } = useJobs()

  if (loading) return <div className="p-6 text-sm text-brand-muted">Loading jobs...</div>
  if (error) return <div className="p-6 text-sm text-[var(--color-rejected)]">{error}</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">All Jobs</h1>
      {jobs.length === 0 && (
        <p className="text-sm text-brand-muted">No applications yet. <Link href="/jobs/new" className="text-accent underline">Add one</Link>.</p>
      )}
      <div className="space-y-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between bg-surface border border-[var(--color-border)] rounded-md p-4"
          >
            <div>
              <p className="font-semibold">{job.company}</p>
              <p className="text-sm text-brand-muted">{job.role}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-brand-muted font-mono">{formatDate(job.last_updated)}</span>
              <StatusBadge status={job.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `app/(dashboard)/jobs/new/page.tsx`**

```tsx
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
    <div className="p-6 max-w-2xl space-y-6">
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
          <JobForm initial={parsed ?? undefined} onSubmit={handleSubmit} submitLabel="Save job" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify manually**

Sign in, go to `/jobs/new`, paste a JD, extract, save.
Expected: redirected to the new job's detail route (404 until Task 22 — confirms navigation works); job appears on `/dashboard` and `/jobs`.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/page.tsx" "app/(dashboard)/jobs/page.tsx" "app/(dashboard)/jobs/new/page.tsx"
git commit -m "feat: wire dashboard, jobs list, and add-job pages"
```

---

### Task 19: `lib/interview-questions.ts` — full tag bank

**Files:**
- Create: `lib/interview-questions.ts`

**Interfaces:**
- Consumes: `InterviewQuestion` type, `KNOWN_TAGS` from `lib/constants.ts`.
- Produces: `getQuestionsForJob(tags: string[]): InterviewQuestion[]` — consumed by `PrepPanel.tsx` (Task 20).

- [ ] **Step 1: Write `lib/interview-questions.ts`**

```ts
import type { InterviewQuestion } from '@/types'

export const universalQuestions: InterviewQuestion[] = [
  { question: 'Tell me about a project you are most proud of.', category: 'behavioral', tip: 'Use STAR format. Pick something with a real challenge and measurable outcome.' },
  { question: 'How do you handle disagreements with teammates on technical decisions?', category: 'behavioral', tip: 'Show you can advocate for your view while staying collaborative.' },
  { question: 'Describe a time you had to learn something new quickly.', category: 'behavioral', tip: 'Emphasize your learning process, not just the outcome.' },
  { question: 'Why do you want to work here?', category: 'company', tip: 'Reference something specific from their product or engineering blog, not generic praise.' },
  { question: 'What are you looking for in your next role?', category: 'rolefit', tip: 'Tie your answer to concrete growth areas, not just compensation.' },
  { question: 'How do you prioritize when everything feels urgent?', category: 'behavioral', tip: 'Mention a specific framework or heuristic you use, with an example.' },
]

export const questionBank: Record<string, InterviewQuestion[]> = {
  'React': [
    { question: 'Explain the difference between useMemo and useCallback.', category: 'technical', tip: 'Focus on what each memoizes — values vs functions — and when overuse hurts performance.' },
    { question: 'How does React\'s reconciliation algorithm decide what to re-render?', category: 'technical', tip: 'Mention keys, the virtual DOM diff, and how state updates trigger re-renders.' },
    { question: 'When would you reach for useReducer instead of useState?', category: 'technical', tip: 'Talk about complex state transitions with multiple sub-values or actions.' },
  ],
  'Next.js': [
    { question: 'What is the difference between a Server Component and a Client Component?', category: 'technical', tip: 'Cover data fetching location, bundle size, and interactivity.' },
    { question: 'How does the App Router handle caching and revalidation?', category: 'technical', tip: 'Mention fetch caching, cacheTag/cacheLife, and route segment config.' },
    { question: 'When would you use a Server Action vs an API route?', category: 'technical', tip: 'Server Actions for form mutations tied to a component, API routes for external consumers.' },
  ],
  'Vue': [
    { question: 'Explain reactivity in Vue 3\'s Composition API.', category: 'technical', tip: 'Mention refs vs reactive objects and when each is appropriate.' },
    { question: 'How do you share logic between components in Vue 3?', category: 'technical', tip: 'Talk about composables and their naming convention.' },
  ],
  'Angular': [
    { question: 'What is the difference between a Component and a Directive in Angular?', category: 'technical', tip: 'Explain structural vs attribute directives with an example.' },
    { question: 'How does Angular\'s dependency injection system work?', category: 'technical', tip: 'Mention providers, injectors, and hierarchical injection.' },
  ],
  'TypeScript': [
    { question: 'What is the difference between an interface and a type alias?', category: 'technical', tip: 'Mention declaration merging and union/intersection support as differentiators.' },
    { question: 'How do generics improve type safety in reusable functions?', category: 'technical', tip: 'Give a concrete example like a generic fetch wrapper.' },
    { question: 'Explain discriminated unions and when you\'d use them.', category: 'technical', tip: 'Use a status/result type example to show narrowing in practice.' },
  ],
  'JavaScript': [
    { question: 'Explain closures with a practical example.', category: 'technical', tip: 'Show a counter or memoization example, not just the definition.' },
    { question: 'What is the event loop and how does it handle async code?', category: 'technical', tip: 'Cover call stack, microtasks vs macrotasks, and promise resolution order.' },
    { question: 'What is the difference between == and ===?', category: 'technical', tip: 'Mention type coercion rules briefly, then explain why === is the safer default.' },
  ],
  'Node.js': [
    { question: 'How does Node.js handle concurrency with a single thread?', category: 'technical', tip: 'Explain the event loop, libuv, and non-blocking I/O.' },
    { question: 'How would you handle a memory leak in a long-running Node process?', category: 'technical', tip: 'Mention heap snapshots, common leak sources like unbounded caches or listeners.' },
  ],
  'Express': [
    { question: 'How does middleware ordering affect request handling in Express?', category: 'technical', tip: 'Explain the request pipeline and next() flow with an example.' },
    { question: 'How would you structure error handling across an Express API?', category: 'technical', tip: 'Mention centralized error-handling middleware and async wrapper patterns.' },
  ],
  'Python': [
    { question: 'Explain the difference between a list and a generator.', category: 'technical', tip: 'Focus on memory usage and lazy evaluation.' },
    { question: 'How does Python\'s GIL affect multi-threaded programs?', category: 'technical', tip: 'Mention when multiprocessing is preferred over threading for CPU-bound work.' },
  ],
  'Django': [
    { question: 'How does Django\'s ORM handle N+1 query problems?', category: 'technical', tip: 'Mention select_related and prefetch_related with an example.' },
    { question: 'Explain Django\'s request/response middleware chain.', category: 'technical', tip: 'Walk through the order middleware executes on request vs response.' },
  ],
  'FastAPI': [
    { question: 'How does FastAPI use type hints for request validation?', category: 'technical', tip: 'Mention Pydantic models and automatic OpenAPI docs generation.' },
    { question: 'How would you handle background tasks in FastAPI?', category: 'technical', tip: 'Mention BackgroundTasks vs a proper task queue for heavier work.' },
  ],
  'PostgreSQL': [
    { question: 'How would you diagnose a slow query in PostgreSQL?', category: 'technical', tip: 'Mention EXPLAIN ANALYZE and looking for sequential scans on large tables.' },
    { question: 'When would you use a composite index vs two separate indexes?', category: 'technical', tip: 'Talk about query patterns that filter on multiple columns together.' },
  ],
  'MySQL': [
    { question: 'What is the difference between InnoDB and MyISAM storage engines?', category: 'technical', tip: 'Focus on transaction support and row-level locking as the key difference.' },
  ],
  'MongoDB': [
    { question: 'When would you choose a document database over a relational one?', category: 'technical', tip: 'Discuss schema flexibility vs the cost of losing joins and strict consistency.' },
    { question: 'How does indexing work differently in MongoDB vs a relational DB?', category: 'technical', tip: 'Mention compound indexes and the importance of matching query shape.' },
  ],
  'Redis': [
    { question: 'What are common use cases for Redis beyond caching?', category: 'technical', tip: 'Mention rate limiting, pub/sub, and session storage.' },
  ],
  'Supabase': [
    { question: 'How does Supabase\'s Row Level Security work under the hood?', category: 'technical', tip: 'Explain that policies are Postgres RLS rules evaluated per-request using auth.uid().' },
    { question: 'What is the difference between the anon key and the service role key?', category: 'technical', tip: 'Anon key respects RLS; service role bypasses it — explain why that matters for security.' },
  ],
  'AWS': [
    { question: 'How would you design a highly available web app on AWS?', category: 'technical', tip: 'Mention multi-AZ deployment, load balancers, and auto-scaling groups.' },
    { question: 'When would you use Lambda vs a container-based service like ECS?', category: 'technical', tip: 'Discuss cold starts, execution duration limits, and cost tradeoffs.' },
  ],
  'GCP': [
    { question: 'How does Google Cloud IAM differ from AWS IAM at a conceptual level?', category: 'technical', tip: 'Mention resource hierarchy (org/folder/project) and predefined vs custom roles.' },
  ],
  'Azure': [
    { question: 'How would you manage secrets for an app deployed on Azure?', category: 'technical', tip: 'Mention Azure Key Vault and managed identities over hardcoded secrets.' },
  ],
  'Docker': [
    { question: 'What is the difference between a Docker image and a container?', category: 'technical', tip: 'Image is the immutable blueprint; container is a running instance of it.' },
    { question: 'How would you reduce the size of a production Docker image?', category: 'technical', tip: 'Mention multi-stage builds and minimal base images like alpine or distroless.' },
  ],
  'Kubernetes': [
    { question: 'What is the difference between a Deployment and a StatefulSet?', category: 'technical', tip: 'StatefulSets provide stable network identity and storage for stateful workloads.' },
    { question: 'How does a Kubernetes readiness probe differ from a liveness probe?', category: 'technical', tip: 'Readiness controls traffic routing; liveness controls restarts.' },
  ],
  'CI/CD': [
    { question: 'What would you include in a good CI pipeline for a web app?', category: 'technical', tip: 'Mention linting, type-checking, tests, and a build step before any deploy.' },
    { question: 'How do you handle secrets safely in a CI/CD pipeline?', category: 'technical', tip: 'Mention encrypted environment variables or a secrets manager, never committing secrets.' },
  ],
  'GraphQL': [
    { question: 'How does GraphQL solve the over-fetching problem of REST?', category: 'technical', tip: 'Clients specify exactly the fields they need in a single request.' },
    { question: 'What is the N+1 query problem in GraphQL and how do you solve it?', category: 'technical', tip: 'Mention DataLoader-style batching to coalesce resolver calls.' },
  ],
  'REST': [
    { question: 'What makes an API RESTful versus just using HTTP?', category: 'technical', tip: 'Mention resource-based URLs, statelessness, and proper HTTP verb/status usage.' },
  ],
  'Tailwind': [
    { question: 'What are the tradeoffs of utility-first CSS like Tailwind vs component-scoped CSS?', category: 'technical', tip: 'Discuss faster iteration and consistency vs verbose markup.' },
  ],
  'CSS': [
    { question: 'Explain the CSS box model.', category: 'technical', tip: 'Cover content, padding, border, margin, and box-sizing behavior.' },
    { question: 'What is the difference between flexbox and CSS grid, and when do you use each?', category: 'technical', tip: 'Flexbox for one-dimensional layout, grid for two-dimensional.' },
  ],
  'HTML': [
    { question: 'Why does semantic HTML matter for accessibility and SEO?', category: 'technical', tip: 'Mention screen readers, ARIA roles, and how it affects search indexing.' },
  ],
  'Git': [
    { question: 'How would you resolve a merge conflict in a shared branch?', category: 'technical', tip: 'Describe the process, not just the git commands — communication with teammates matters too.' },
    { question: 'What is the difference between git merge and git rebase?', category: 'technical', tip: 'Discuss history preservation vs a linear, cleaner history, and when each is appropriate.' },
  ],
  'Agile': [
    { question: 'How do you handle scope creep mid-sprint?', category: 'rolefit', tip: 'Talk about communicating impact to the team/PO rather than silently absorbing it.' },
  ],
  'Scrum': [
    { question: 'What is the purpose of a retrospective, and how do you make one actually useful?', category: 'rolefit', tip: 'Emphasize actionable follow-ups, not just venting.' },
  ],
  'Figma': [
    { question: 'How do you collaborate with designers when a Figma spec is ambiguous?', category: 'rolefit', tip: 'Mention asking clarifying questions early rather than guessing and reworking later.' },
  ],
  'Remote': [
    { question: 'How do you stay productive and communicative on a fully remote team?', category: 'rolefit', tip: 'Give concrete habits — async updates, documenting decisions, overlap hours.' },
  ],
}

export function getQuestionsForJob(tags: string[]): InterviewQuestion[] {
  const tagQuestions = tags.flatMap((tag) => questionBank[tag] ?? [])
  return [...universalQuestions, ...tagQuestions]
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/interview-questions.ts
git commit -m "feat: add curated interview question bank for all known tags"
```

---

### Task 20: `PrepPanel.tsx` + `QuestionCard.tsx`

**Files:**
- Create: `components/prep/QuestionCard.tsx`
- Create: `components/prep/PrepPanel.tsx`

**Interfaces:**
- Consumes: `getQuestionsForJob()` (Task 19), `InterviewQuestion` type, `stagger`/`fadeUp`/`slideFromRight` from `lib/animations.ts`.
- Produces: `<PrepPanel tags={job.tags} />` — consumed by `jobs/[id]/page.tsx` (Task 21).

- [ ] **Step 1: Write `components/prep/QuestionCard.tsx`**

```tsx
import { motion } from 'framer-motion'
import type { InterviewQuestion } from '@/types'
import { fadeUp } from '@/lib/animations'

interface Props {
  question: InterviewQuestion
}

export function QuestionCard({ question }: Props) {
  return (
    <motion.div variants={fadeUp} className="border border-[var(--color-border)] rounded-md p-4 mb-3">
      <p className="text-sm font-medium">{question.question}</p>
      {question.tip && <p className="text-xs text-brand-muted mt-2">💡 {question.tip}</p>}
    </motion.div>
  )
}
```

- [ ] **Step 2: Write `components/prep/PrepPanel.tsx`**

```tsx
'use client'

import { motion } from 'framer-motion'
import { getQuestionsForJob } from '@/lib/interview-questions'
import { stagger } from '@/lib/animations'
import { QuestionCard } from './QuestionCard'
import type { InterviewQuestion } from '@/types'

interface Props {
  tags: string[]
}

const CATEGORY_LABELS: Record<InterviewQuestion['category'], string> = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  company: 'Company',
  rolefit: 'Role Fit',
}

export function PrepPanel({ tags }: Props) {
  const questions = getQuestionsForJob(tags)
  const grouped = questions.reduce<Record<string, InterviewQuestion[]>>((acc, q) => {
    (acc[q.category] ??= []).push(q)
    return acc
  }, {})

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger()} className="bg-surface border border-[var(--color-border)] rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-1">Interview Prep</h2>
      {tags.length > 0 && (
        <p className="text-xs text-brand-muted font-mono mb-4">Matched to: {tags.join(' · ')}</p>
      )}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-2">
            {CATEGORY_LABELS[category as InterviewQuestion['category']]}
          </h3>
          {items.map((q, i) => (
            <QuestionCard key={i} question={q} />
          ))}
        </div>
      ))}
    </motion.div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/prep
git commit -m "feat: add interview prep panel with category grouping"
```

---

### Task 21: Job detail page

**Files:**
- Create: `app/(dashboard)/jobs/[id]/page.tsx`

**Interfaces:**
- Consumes: `useJobs()` (Task 15), `StatusBadge` (Task 16), `PrepPanel` (Task 20), `JobForm` (Task 12, edit mode).
- Produces: the route `hooks/useJobs.ts`'s `createJob` redirect (Task 18) targets; fulfills the MVP checklist's "Job detail page" item.

- [ ] **Step 1: Write `app/(dashboard)/jobs/[id]/page.tsx`**

```tsx
'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useJobs } from '@/hooks/useJobs'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { PrepPanel } from '@/components/prep/PrepPanel'
import { JobForm, type JobFormValues } from '@/components/jobs/JobForm'
import { formatDate } from '@/lib/utils'

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { jobs, loading, updateJob, deleteJob } = useJobs()
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  const job = jobs.find((j) => j.id === id)

  if (loading) return <div className="p-6 text-sm text-brand-muted">Loading...</div>
  if (!job) return <div className="p-6 text-sm text-brand-muted">Job not found.</div>

  async function handleUpdate(values: JobFormValues) {
    await updateJob(id, values)
    setEditing(false)
  }

  async function handleDelete() {
    await deleteJob(id)
    router.push('/jobs')
  }

  if (editing) {
    return (
      <div className="p-6 max-w-2xl">
        <JobForm initial={job} onSubmit={handleUpdate} submitLabel="Save changes" />
      </div>
    )
  }

  return (
    <div className="p-6 grid md:grid-cols-[1fr_360px] gap-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{job.company}</h1>
            <p className="text-brand-muted">{job.role}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={() => setEditing(true)} className="text-sm text-accent underline">Edit</button>
          <button onClick={handleDelete} className="text-sm text-[var(--color-rejected)] underline">Delete</button>
        </div>

        <dl className="grid grid-cols-2 gap-4 mt-6 text-sm">
          {job.salary_range && (
            <div><dt className="text-brand-muted">Salary</dt><dd className="font-mono">{job.salary_range}</dd></div>
          )}
          {job.location && (
            <div><dt className="text-brand-muted">Location</dt><dd>{job.location}</dd></div>
          )}
          <div><dt className="text-brand-muted">Last updated</dt><dd>{formatDate(job.last_updated)}</dd></div>
        </dl>

        {job.description && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold mb-2">Description</h2>
            <p className="text-sm whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {job.notes && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold mb-2">Notes</h2>
            <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}
      </div>

      <PrepPanel tags={job.tags} />
    </div>
  )
}
```

- [ ] **Step 2: Verify manually**

Navigate to a job's detail page from `/jobs`.
Expected: company/role/status render, edit toggles to `JobForm` with prefilled values, delete removes the job and redirects to `/jobs`, prep panel shows matched + universal questions.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/jobs/[id]/page.tsx"
git commit -m "feat: add job detail page with edit, delete, and interview prep"
```

---

### Task 22: `lib/reminders.ts` with unit tests (TDD)

**Files:**
- Create: `lib/reminders.ts`
- Test: `__tests__/lib/reminders.test.ts`

**Interfaces:**
- Consumes: `Job` type, `STALE_DAYS` from `lib/constants.ts`.
- Produces: `getStaleJobs(jobs: Job[], now?: Date): Job[]` — consumed by `hooks/useReminders.ts` (Task 23).

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/reminders.test.ts
import { describe, it, expect } from 'vitest'
import { getStaleJobs } from '@/lib/reminders'
import type { Job } from '@/types'

function makeJob(overrides: Partial<Job>): Job {
  return {
    id: '1',
    user_id: 'u1',
    company: 'Acme',
    role: 'Engineer',
    status: 'applied',
    tags: [],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('getStaleJobs', () => {
  const now = new Date('2026-07-03T00:00:00Z')

  it('flags an applied job with no update in 7+ days', () => {
    const job = makeJob({ status: 'applied', last_updated: '2026-06-25T00:00:00Z' })
    expect(getStaleJobs([job], now)).toEqual([job])
  })

  it('does not flag an applied job updated within 7 days', () => {
    const job = makeJob({ status: 'applied', last_updated: '2026-06-28T00:00:00Z' })
    expect(getStaleJobs([job], now)).toEqual([])
  })

  it('does not flag a non-applied job regardless of age', () => {
    const job = makeJob({ status: 'saved', last_updated: '2026-06-01T00:00:00Z' })
    expect(getStaleJobs([job], now)).toEqual([])
  })

  it('does not flag exactly at the 7-day boundary', () => {
    const job = makeJob({ status: 'applied', last_updated: '2026-06-26T00:00:00Z' })
    expect(getStaleJobs([job], now)).toEqual([])
  })

  it('flags just past the 7-day boundary', () => {
    const job = makeJob({ status: 'applied', last_updated: '2026-06-25T23:59:59Z' })
    expect(getStaleJobs([job], now)).toEqual([job])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/reminders.test.ts`
Expected: FAIL — `Cannot find module '@/lib/reminders'`.

- [ ] **Step 3: Write `lib/reminders.ts`**

```ts
import type { Job } from '@/types'
import { STALE_DAYS } from '@/lib/constants'

export function getStaleJobs(jobs: Job[], now: Date = new Date()): Job[] {
  const staleThresholdMs = STALE_DAYS * 24 * 60 * 60 * 1000

  return jobs.filter((job) => {
    if (job.status !== 'applied') return false
    const lastUpdated = new Date(job.last_updated).getTime()
    return now.getTime() - lastUpdated > staleThresholdMs
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/reminders.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reminders.ts __tests__/lib/reminders.test.ts
git commit -m "feat: add stale-application detection with unit tests"
```

---

### Task 23: `useReminders.ts`, `ReminderFlag.tsx`, reminders page, sidebar badge

**Files:**
- Create: `hooks/useReminders.ts`
- Create: `components/jobs/ReminderFlag.tsx`
- Create: `app/(dashboard)/reminders/page.tsx`
- Modify: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `getStaleJobs()` (Task 22), `useJobs()` (Task 15), `StatusBadge` (Task 16).
- Produces: fulfills the MVP checklist's "Stale application reminder (in-app)" item and replaces the `reminderCount = 0` stub from Task 9.

- [ ] **Step 1: Write `hooks/useReminders.ts`**

```ts
'use client'

import { useMemo } from 'react'
import type { Job } from '@/types'
import { getStaleJobs } from '@/lib/reminders'

export function useReminders(jobs: Job[]) {
  const staleJobs = useMemo(() => getStaleJobs(jobs), [jobs])
  return { staleJobs, count: staleJobs.length }
}
```

- [ ] **Step 2: Write `components/jobs/ReminderFlag.tsx`**

```tsx
import { differenceInDays } from 'date-fns'
import type { Job } from '@/types'

interface Props {
  job: Job
}

export function ReminderFlag({ job }: Props) {
  const days = differenceInDays(new Date(), new Date(job.last_updated))
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-[#F59E0B] mt-2">
      No update in {days} days
    </div>
  )
}
```

- [ ] **Step 3: Write `app/(dashboard)/reminders/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
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
        <p className="text-sm text-brand-muted">No stale applications. Nice work staying on top of things.</p>
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
```

- [ ] **Step 4: Modify `app/(dashboard)/layout.tsx`** to compute the real reminder count via a client wrapper

```tsx
// app/(dashboard)/layout.tsx — replace the reminderCount stub and Sidebar usage
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { SidebarWithReminders } from '@/components/layout/SidebarWithReminders'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex">
      <div className="hidden md:block">
        <SidebarWithReminders />
      </div>
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
```

- [ ] **Step 5: Create `components/layout/SidebarWithReminders.tsx`** (client wrapper — `layout.tsx` stays a Server Component)

```tsx
'use client'

import { useJobs } from '@/hooks/useJobs'
import { useReminders } from '@/hooks/useReminders'
import { Sidebar } from './Sidebar'

export function SidebarWithReminders() {
  const { jobs } = useJobs()
  const { count } = useReminders(jobs)
  return <Sidebar reminderCount={count} />
}
```

- [ ] **Step 6: Verify manually**

Create an "applied" job, manually backdate its `last_updated` in Supabase to 8 days ago, reload `/dashboard`.
Expected: sidebar badge shows "1", `/reminders` lists the job with "No update in 8 days", clicking "Update Status" moves it to Interview and it disappears from reminders.

- [ ] **Step 7: Commit**

```bash
git add hooks/useReminders.ts components/jobs/ReminderFlag.tsx "app/(dashboard)/reminders/page.tsx" "app/(dashboard)/layout.tsx" components/layout/SidebarWithReminders.tsx
git commit -m "feat: add stale-application reminders with sidebar badge"
```

---

### Task 24: Toast notifications

**Files:**
- Create: `components/ui/toaster.tsx` (via shadcn CLI)
- Modify: `app/layout.tsx`
- Modify: `hooks/useJobs.ts`

**Interfaces:**
- Consumes: shadcn's `useToast`/`Toaster`.
- Produces: toast calls wired into `useJobs.ts`'s create/update/delete paths per the event table in `design.md`.

- [ ] **Step 1: Install shadcn toast**

```bash
npx shadcn@latest add toast
```

- [ ] **Step 2: Add `<Toaster />` to `app/layout.tsx`**

```tsx
// app/layout.tsx — add import and render alongside {children}
import { Toaster } from '@/components/ui/toaster'
// ... inside the root layout's <body>, after {children}:
// <Toaster />
```

- [ ] **Step 3: Wire toasts into `hooks/useJobs.ts`**

Modify `createJob`, `updateJobStatus`, and `deleteJob` to call `toast()` from `@/components/ui/use-toast` on success/failure:

```ts
// hooks/useJobs.ts — add at top of file
import { toast } from '@/components/ui/use-toast'

// inside createJob, after setJobs((prev) => [json.data, ...prev]):
toast({ description: `✓ Job saved — ${json.data.company} · ${json.data.role}` })

// inside updateJobStatus, after the successful PATCH (replace the try body's end):
toast({ description: `✓ Moved to ${json?.data?.status ?? status}` })

// inside updateJobStatus's failure branch (catch/if !res.ok), before throwing:
toast({ description: "Couldn't update status.", variant: 'destructive' })

// inside deleteJob's failure branch, before throwing:
toast({ description: "Couldn't delete job.", variant: 'destructive' })
```

- [ ] **Step 4: Wire parse-result toasts into `components/jobs/ParseInput.tsx`**

```tsx
// ParseInput.tsx — inside handleExtract, after parse(text):
import { toast } from '@/components/ui/use-toast'
// ...
function handleExtract() {
  const parsed = parse(text)
  if (!parsed) return
  const fieldsFound = [parsed.company !== 'Unknown Company', parsed.role, parsed.salary_range, parsed.location, parsed.tags.length > 0].filter(Boolean).length
  if (fieldsFound >= 4) {
    toast({ description: '✓ Details extracted — review and confirm' })
  } else if (fieldsFound > 0) {
    toast({ description: "⚠ Some fields couldn't be detected — fill them in below" })
  } else {
    toast({ description: "✗ Couldn't extract details. Fill in the fields manually.", variant: 'destructive' })
  }
  onParsed(parsed)
}
```

- [ ] **Step 5: Verify manually**

Save a job, update its status via drag, delete a job, paste a JD with partial info.
Expected: each action shows a bottom-right toast matching the `design.md` event table, 4s duration, destructive-styled for errors.

- [ ] **Step 6: Commit**

```bash
git add components/ui hooks/useJobs.ts components/jobs/ParseInput.tsx app/layout.tsx
git commit -m "feat: wire toast notifications for job and parse events"
```

---

### Task 25: Responsive pass + reduced-motion verification

**Files:**
- Modify: `components/kanban/Board.tsx` (horizontal scroll confirmation, no code change expected — verification task)
- Modify: `app/(dashboard)/jobs/[id]/page.tsx` (confirm `md:grid-cols-[1fr_360px]` collapses to single column below `md`)

**Interfaces:**
- Consumes: existing components from Tasks 9, 17, 21.
- Produces: confirmed responsive behavior at <768px (MobileNav visible, Sidebar hidden) and `prefers-reduced-motion` compliance.

- [ ] **Step 1: Verify mobile layout**

Run: `npm run dev`, open browser dev tools, set viewport to 375×812 (iPhone).
Expected: Sidebar hidden, `MobileNav` bottom bar visible with 4 icons, Kanban board scrolls horizontally with columns still readable, job detail page stacks to a single column, `PrepPanel` renders below job details (not beside it).

- [ ] **Step 2: Verify reduced motion**

In dev tools, enable "Emulate CSS media feature prefers-reduced-motion: reduce" (Chrome DevTools → Rendering tab).
Expected: aurora background stops animating, staggered reveals in `ParseInput`/`PrepPanel` appear instantly instead of animating, per the `globals.css` media query from Task 2.

- [ ] **Step 3: Fix any overflow/wrapping issues found**

If Step 1 or 2 surfaces a real layout bug (e.g., `PrepPanel` not stacking, MobileNav overlapping content), fix the specific Tailwind classes in the affected file — do not restructure components wholesale.

- [ ] **Step 4: Commit** (only if Step 3 required changes)

```bash
git add -A
git commit -m "fix: responsive and reduced-motion adjustments"
```

---

### Task 26: Deploy to Vercel

**Files:**
- Create: `vercel.json` (only if custom config is needed — otherwise skip; Vercel auto-detects Next.js)

**Interfaces:**
- Consumes: `.env.local` values (Task 3) as the source for Vercel environment variables.
- Produces: a live production URL fulfilling the MVP checklist's "Deploy to Vercel with env vars configured" item.

- [ ] **Step 1: Push to a GitHub repository**

```bash
git remote add origin <repo-url>
git push -u origin main
```

- [ ] **Step 2: Import the project in Vercel**

Connect the GitHub repo in the Vercel dashboard (or `vercel link` via CLI), framework preset auto-detects Next.js 16.

- [ ] **Step 3: Configure environment variables in Vercel**

Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (set to the production URL) for the Production environment.

- [ ] **Step 4: Update Supabase and Google OAuth redirect allowlists**

In Supabase Dashboard → Authentication → URL Configuration, add the production `NEXT_PUBLIC_APP_URL` and `<prod-url>/callback` to the allowed redirect URLs. In Google Cloud Console, add the same production callback URL to the OAuth client's authorized redirect URIs.

- [ ] **Step 5: Deploy and verify**

Trigger a deploy (automatic on push, or `vercel --prod`).
Expected: production URL loads `/login`, sign-in with Google and email/password both work, dashboard loads jobs correctly, no console errors referencing missing env vars.

- [ ] **Step 6: Commit** (if `vercel.json` was needed)

```bash
git add vercel.json
git commit -m "chore: add Vercel deployment config"
```

---

## Self-Review Notes

- **Spec coverage:** all 8 MVP checklist items map to tasks — auth (6-8), JD paste (10-11, 19), manual entry (12), Kanban (17-18), job detail (21), interview prep (19-20), reminders (22-23), responsive (25), deploy (26). Security section covered by Tasks 3 (RLS split policies, OAuth allowlist, leaked-password protection), 6 (proxy.ts session revalidation), 7-8 (generic errors, email verification), 13-14 (server-side input validation, no service-role key usage).
- **Type consistency:** `Job`, `JobStatus`, `ParsedJob`, `InterviewQuestion` defined once in Task 4, imported everywhere else. `JobFormValues` defined once in Task 12 (`JobForm.tsx`), imported by Tasks 15, 18, 21. `getStaleJobs`/`getQuestionsForJob`/`parseJobDescription` each defined in exactly one task and consumed by name-matching signatures in later tasks.
- **No placeholders:** every step contains complete, runnable code or an exact command with expected output.
