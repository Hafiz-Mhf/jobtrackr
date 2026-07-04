# Scalable JD Tag Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `KNOWN_TAGS` array with an externalized, alias-aware skills dictionary and a per-user, DB-backed set of learned custom tags the client parser recognizes across devices.

**Architecture:** A bundled `lib/data/skills.json` (canonical + aliases) drives client-side matching in `lib/skills.ts` (compiled once at module load). `extractTags(text, customTags)` merges dictionary hits with the user's learned tags and normalizes to canonical form. A new `user_tags` table (RLS-scoped) stores learned tags; `/api/jobs` learns new ones on save (best-effort, never blocking), `/api/tags` serves them, and a client `TagsProvider` supplies them to `ParseInput`/`JobForm`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (Postgres + RLS), Vitest, Framer Motion (unaffected).

## Global Constraints

- **No external AI API** — extraction stays deterministic/heuristic. Never install `@anthropic-ai/sdk` or call an LLM.
- **Parser runs client-side** — preserve the instant paste→extract UX.
- **TypeScript strict, no `any`.**
- **Supabase server client** (`lib/supabase/server.ts`) in API routes; browser client only in Client Components.
- **Per-operation RLS policies** checking `auth.uid() = user_id` (not one blanket `for all`).
- **Validate/cap API input server-side**; log errors with a `[route-name]` prefix, never full request bodies.
- **No new dependencies** without flagging — this plan adds none.
- Migration files live in `supabase/migrations/`, numbered sequentially (next is `0004`).

---

### Task 1: Skills dictionary + matching module

**Files:**
- Create: `lib/data/skills.json`
- Create: `lib/skills.ts`
- Test: `__tests__/lib/skills.test.ts`

**Interfaces:**
- Produces:
  - `matchDictionary(text: string): string[]` — canonical forms whose canonical/alias appears in `text` (word-boundary, case-insensitive).
  - `matchCustomTags(text: string, customTags: string[]): string[]` — the `customTags` entries that appear in `text` (word-boundary, case-insensitive).
  - `normalizeTag(raw: string): string` — canonical if `raw` is a known alias/canonical, else trimmed `raw`.
  - `isDictionaryTag(tag: string): boolean` — whether `tag` (case-insensitive) is a canonical or alias.

- [ ] **Step 1: Create the dictionary data file**

Create `lib/data/skills.json`:

```json
[
  { "canonical": "React", "aliases": ["reactjs", "react.js"] },
  { "canonical": "Next.js", "aliases": ["nextjs", "next"] },
  { "canonical": "Vue", "aliases": ["vuejs", "vue.js"] },
  { "canonical": "Angular", "aliases": ["angularjs"] },
  { "canonical": "Svelte", "aliases": ["sveltejs"] },
  { "canonical": "TypeScript", "aliases": ["ts"] },
  { "canonical": "JavaScript", "aliases": ["js", "ecmascript"] },
  { "canonical": "Node.js", "aliases": ["node", "nodejs"] },
  { "canonical": "Express", "aliases": ["expressjs"] },
  { "canonical": "Python", "aliases": ["py"] },
  { "canonical": "Django", "aliases": [] },
  { "canonical": "FastAPI", "aliases": [] },
  { "canonical": "Flask", "aliases": [] },
  { "canonical": "Java", "aliases": [] },
  { "canonical": "Spring", "aliases": ["spring boot"] },
  { "canonical": "Go", "aliases": ["golang"] },
  { "canonical": "Rust", "aliases": [] },
  { "canonical": "PHP", "aliases": [] },
  { "canonical": "Laravel", "aliases": [] },
  { "canonical": "Ruby", "aliases": [] },
  { "canonical": "Rails", "aliases": ["ruby on rails"] },
  { "canonical": "Swift", "aliases": [] },
  { "canonical": "Kotlin", "aliases": [] },
  { "canonical": "C++", "aliases": ["cpp"] },
  { "canonical": "C#", "aliases": ["csharp", "c-sharp"] },
  { "canonical": ".NET", "aliases": ["dotnet", "asp.net"] },
  { "canonical": "Flutter", "aliases": [] },
  { "canonical": "React Native", "aliases": ["react-native"] },
  { "canonical": "Redux", "aliases": [] },
  { "canonical": "PostgreSQL", "aliases": ["postgres", "psql"] },
  { "canonical": "MySQL", "aliases": [] },
  { "canonical": "MongoDB", "aliases": ["mongo"] },
  { "canonical": "Redis", "aliases": [] },
  { "canonical": "Supabase", "aliases": [] },
  { "canonical": "SQL", "aliases": [] },
  { "canonical": "AWS", "aliases": ["amazon web services"] },
  { "canonical": "GCP", "aliases": ["google cloud", "google cloud platform"] },
  { "canonical": "Azure", "aliases": ["microsoft azure"] },
  { "canonical": "Docker", "aliases": [] },
  { "canonical": "Kubernetes", "aliases": ["k8s", "kube"] },
  { "canonical": "Terraform", "aliases": [] },
  { "canonical": "Jenkins", "aliases": [] },
  { "canonical": "GitHub Actions", "aliases": ["github-actions"] },
  { "canonical": "CI/CD", "aliases": ["cicd"] },
  { "canonical": "Linux", "aliases": [] },
  { "canonical": "Bash", "aliases": ["shell scripting"] },
  { "canonical": "GraphQL", "aliases": [] },
  { "canonical": "REST", "aliases": ["rest api", "restful"] },
  { "canonical": "Tailwind", "aliases": ["tailwindcss", "tailwind css"] },
  { "canonical": "Sass", "aliases": ["scss"] },
  { "canonical": "CSS", "aliases": ["css3"] },
  { "canonical": "HTML", "aliases": ["html5"] },
  { "canonical": "Webpack", "aliases": [] },
  { "canonical": "Vite", "aliases": [] },
  { "canonical": "Jest", "aliases": [] },
  { "canonical": "Cypress", "aliases": [] },
  { "canonical": "Playwright", "aliases": [] },
  { "canonical": "Git", "aliases": [] },
  { "canonical": "Agile", "aliases": [] },
  { "canonical": "Scrum", "aliases": [] },
  { "canonical": "Figma", "aliases": [] },
  { "canonical": "Remote", "aliases": [] },
  { "canonical": "Excel", "aliases": ["microsoft excel", "ms excel"] },
  { "canonical": "PowerPoint", "aliases": ["powerpoint", "ms powerpoint"] },
  { "canonical": "Word", "aliases": ["microsoft word"] },
  { "canonical": "SAP", "aliases": [] },
  { "canonical": "Power BI", "aliases": ["powerbi", "power-bi"] },
  { "canonical": "Power Automate", "aliases": [] },
  { "canonical": "ServiceNow", "aliases": ["service now"] },
  { "canonical": "Salesforce", "aliases": [] },
  { "canonical": "SharePoint", "aliases": ["share point"] },
  { "canonical": "Tableau", "aliases": [] },
  { "canonical": "VBA", "aliases": [] },
  { "canonical": "Jira", "aliases": [] },
  { "canonical": "Audit", "aliases": ["auditing"] },
  { "canonical": "Compliance", "aliases": [] },
  { "canonical": "ITAM", "aliases": ["it asset management"] }
]
```

> Note: symbol-heavy canonicals like `C++`/`C#` won't match via a `\b` boundary on the trailing symbol; they match through their aliases (`cpp`, `csharp`). This is acceptable — aliases carry them.

- [ ] **Step 2: Write the failing test**

Create `__tests__/lib/skills.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchDictionary, matchCustomTags, normalizeTag, isDictionaryTag } from '@/lib/skills'

describe('skills dictionary', () => {
  it('matches a canonical term', () => {
    expect(matchDictionary('We use React heavily')).toContain('React')
  })

  it('matches an alias and returns the canonical form', () => {
    expect(matchDictionary('strong k8s experience')).toContain('Kubernetes')
    expect(matchDictionary('built with reactjs')).toContain('React')
  })

  it('is case-insensitive', () => {
    expect(matchDictionary('MUST KNOW typescript')).toContain('TypeScript')
  })

  it('respects word boundaries (no partial matches)', () => {
    expect(matchDictionary('We use Reactive Streams')).not.toContain('React')
  })

  it('matches a multi-word alias', () => {
    expect(matchDictionary('reporting in power bi')).toContain('Power BI')
  })

  it('does not duplicate canonicals when multiple aliases hit', () => {
    const result = matchDictionary('js and javascript and ecmascript')
    expect(result.filter((t) => t === 'JavaScript')).toHaveLength(1)
  })

  it('normalizeTag maps aliases to canonical, passes through unknowns', () => {
    expect(normalizeTag('k8s')).toBe('Kubernetes')
    expect(normalizeTag('REACTJS')).toBe('React')
    expect(normalizeTag('Snowflake')).toBe('Snowflake')
    expect(normalizeTag('  Databricks  ')).toBe('Databricks')
  })

  it('matchCustomTags finds custom tags present in text, case-insensitively', () => {
    expect(matchCustomTags('experience with Snowflake and dbt', ['Snowflake', 'dbt', 'Kafka']))
      .toEqual(['Snowflake', 'dbt'])
  })

  it('isDictionaryTag recognizes canonicals and aliases only', () => {
    expect(isDictionaryTag('React')).toBe(true)
    expect(isDictionaryTag('k8s')).toBe(true)
    expect(isDictionaryTag('Snowflake')).toBe(false)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/skills.test.ts`
Expected: FAIL — `Cannot find module '@/lib/skills'`.

- [ ] **Step 4: Implement the matching module**

Create `lib/skills.ts`:

```ts
import skillsData from '@/lib/data/skills.json'

interface SkillEntry {
  canonical: string
  aliases: string[]
}

const SKILLS = skillsData as SkillEntry[]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Compile one regex per entry ONCE at module load, not per call.
const COMPILED: { canonical: string; re: RegExp }[] = SKILLS.map((entry) => {
  const terms = [entry.canonical, ...entry.aliases].map(escapeRegex)
  return {
    canonical: entry.canonical,
    re: new RegExp(`\\b(?:${terms.join('|')})\\b`, 'i'),
  }
})

// Lowercased alias/canonical -> canonical, built once.
const ALIAS_TO_CANONICAL = new Map<string, string>()
for (const entry of SKILLS) {
  ALIAS_TO_CANONICAL.set(entry.canonical.toLowerCase(), entry.canonical)
  for (const alias of entry.aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), entry.canonical)
  }
}

export function matchDictionary(text: string): string[] {
  return COMPILED.filter((c) => c.re.test(text)).map((c) => c.canonical)
}

export function matchCustomTags(text: string, customTags: string[]): string[] {
  return customTags.filter((tag) => {
    const t = tag.trim()
    if (!t) return false
    return new RegExp(`\\b${escapeRegex(t)}\\b`, 'i').test(text)
  })
}

export function normalizeTag(raw: string): string {
  const key = raw.trim().toLowerCase()
  return ALIAS_TO_CANONICAL.get(key) ?? raw.trim()
}

export function isDictionaryTag(tag: string): boolean {
  return ALIAS_TO_CANONICAL.has(tag.trim().toLowerCase())
}
```

Verify `tsconfig.json` allows JSON imports (`resolveJsonModule`). Next.js 16 / TS 5 default `moduleResolution: "bundler"` enables it; if a `resolveJsonModule` error appears, add `"resolveJsonModule": true` to `compilerOptions`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/skills.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/data/skills.json lib/skills.ts __tests__/lib/skills.test.ts
git commit -m "feat: externalized skills dictionary with alias-aware normalized matching"
```

---

### Task 2: `extractTags` gains `customTags`; remove `KNOWN_TAGS`

**Files:**
- Modify: `lib/parser.ts`
- Modify: `lib/constants.ts` (remove `KNOWN_TAGS`)
- Test: `__tests__/lib/parser.test.ts` (extend)

**Interfaces:**
- Consumes: `matchDictionary`, `matchCustomTags`, `normalizeTag` from `lib/skills.ts` (Task 1).
- Produces:
  - `extractTags(text: string, customTags?: string[]): string[]`
  - `parseJobDescription(text: string, customTags?: string[]): ParsedJob`

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/lib/parser.test.ts` (inside the existing `describe`):

```ts
  it('merges user custom tags with dictionary tags', () => {
    const result = parseJobDescription('Experience with React and Snowflake.', ['Snowflake'])
    expect(result.tags).toEqual(expect.arrayContaining(['React', 'Snowflake']))
  })

  it('normalizes aliases to canonical in extracted tags', () => {
    const result = parseJobDescription('We deploy on k8s with reactjs.')
    expect(result.tags).toEqual(expect.arrayContaining(['Kubernetes', 'React']))
    expect(result.tags).not.toContain('k8s')
  })

  it('deduplicates when a custom tag equals a dictionary alias', () => {
    const result = parseJobDescription('Strong React and reactjs work.', ['React'])
    expect(result.tags.filter((t) => t === 'React')).toHaveLength(1)
  })

  it('behaves like dictionary-only when no custom tags are given', () => {
    const result = parseJobDescription('Must know react, TypeScript and Node.js well.')
    expect(result.tags).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Node.js']))
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/parser.test.ts`
Expected: FAIL — `parseJobDescription` takes one arg / custom tags not merged.

- [ ] **Step 3: Update `lib/parser.ts`**

Replace the import line and the `extractTags`/`parseJobDescription` definitions.

Change the top import:

```ts
import type { ParsedJob } from '@/types'
import { matchDictionary, matchCustomTags, normalizeTag } from '@/lib/skills'
```

(Remove the old `import { KNOWN_TAGS } from '@/lib/constants'`.)

Update the entry function signature:

```ts
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
```

Replace the existing `extractTags` function with:

```ts
function extractTags(text: string, customTags: string[] = []): string[] {
  const merged = [...matchDictionary(text), ...matchCustomTags(text, customTags)].map(normalizeTag)
  return [...new Set(merged)]
}
```

- [ ] **Step 4: Remove `KNOWN_TAGS` from `lib/constants.ts`**

Delete the entire `export const KNOWN_TAGS = [ ... ] as const` block (the tech + non-tech tag arrays). Leave all other exports (`JOB_STATUSES`, `STATUS_LABELS`, `STATUS_EMPTY_COPY`, `STATUS_ACCENT`, `STALE_DAYS`, `MAX_*`) intact.

- [ ] **Step 5: Run the full test suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests PASS (existing parser tests unchanged in behavior), tsc clean. If tsc reports an unused/broken `KNOWN_TAGS` import anywhere, grep `KNOWN_TAGS` and remove the dangling reference.

- [ ] **Step 6: Commit**

```bash
git add lib/parser.ts lib/constants.ts __tests__/lib/parser.test.ts
git commit -m "feat: extractTags merges normalized dictionary + custom tags; drop KNOWN_TAGS"
```

---

### Task 3: `user_tags` table migration

**Files:**
- Create: `supabase/migrations/0004_user_tags.sql`

**Interfaces:**
- Produces: table `public.user_tags (id, user_id, tag, created_at)` with RLS select/insert/delete policies and a case-insensitive unique index.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0004_user_tags.sql`:

```sql
create table public.user_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tag        text not null,
  created_at timestamptz not null default now()
);

create unique index user_tags_user_tag_lower_idx
  on public.user_tags (user_id, lower(tag));

create index user_tags_user_id_idx on public.user_tags (user_id);

alter table public.user_tags enable row level security;

create policy "user_tags_select_own" on public.user_tags
  for select using (auth.uid() = user_id);

create policy "user_tags_insert_own" on public.user_tags
  for insert with check (auth.uid() = user_id);

create policy "user_tags_delete_own" on public.user_tags
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration to the live project**

Apply via the Supabase MCP `apply_migration` tool (project `apgdyaiztmsnohakjkfg`), name `0004_user_tags`, with the SQL body above.

- [ ] **Step 3: Verify the table exists**

Use the Supabase MCP `list_tables` (schema `public`) and confirm `user_tags` is present with the four columns and RLS enabled. Alternatively `list_migrations` shows `0004_user_tags` applied.
Expected: `user_tags` present, `rls_enabled = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_user_tags.sql
git commit -m "feat: add user_tags table with RLS and case-insensitive unique index"
```

---

### Task 4: Tag-learning helper with sanity guards

**Files:**
- Create: `lib/tags/learn.ts`
- Test: `__tests__/lib/learn.test.ts`

**Interfaces:**
- Consumes: `isDictionaryTag` from `lib/skills.ts` (Task 1); `SupabaseClient` type from `@supabase/supabase-js`.
- Produces:
  - `MAX_CUSTOM_TAGS: number` (500)
  - `filterLearnableTags(tags: string[], existingCount: number): string[]` — pure; applies guards, dedups within batch, caps to remaining headroom.
  - `learnTags(supabase: SupabaseClient, userId: string, tags: string[]): Promise<void>` — best-effort persistence; never throws.

- [ ] **Step 1: Write the failing test (pure function only)**

Create `__tests__/lib/learn.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { filterLearnableTags, MAX_CUSTOM_TAGS } from '@/lib/tags/learn'

describe('filterLearnableTags', () => {
  it('keeps novel non-dictionary tags', () => {
    expect(filterLearnableTags(['Snowflake', 'dbt'], 0)).toEqual(['Snowflake', 'dbt'])
  })

  it('drops dictionary tags and their aliases', () => {
    expect(filterLearnableTags(['React', 'k8s', 'Snowflake'], 0)).toEqual(['Snowflake'])
  })

  it('drops stopwords', () => {
    expect(filterLearnableTags(['the', 'and', 'Snowflake'], 0)).toEqual(['Snowflake'])
  })

  it('drops too-short and too-long tags', () => {
    const long = 'x'.repeat(31)
    expect(filterLearnableTags(['a', long, 'dbt'], 0)).toEqual(['dbt'])
  })

  it('dedups case-insensitively within a batch', () => {
    expect(filterLearnableTags(['Snowflake', 'snowflake', 'SNOWFLAKE'], 0)).toEqual(['Snowflake'])
  })

  it('caps to the remaining headroom under MAX_CUSTOM_TAGS', () => {
    const result = filterLearnableTags(['aa', 'bb', 'cc'], MAX_CUSTOM_TAGS - 1)
    expect(result).toHaveLength(1)
  })

  it('returns empty when already at the cap', () => {
    expect(filterLearnableTags(['aa', 'bb'], MAX_CUSTOM_TAGS)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/learn.test.ts`
Expected: FAIL — `Cannot find module '@/lib/tags/learn'`.

- [ ] **Step 3: Implement `lib/tags/learn.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { isDictionaryTag } from '@/lib/skills'

export const MAX_CUSTOM_TAGS = 500

const TAG_STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'our', 'with', 'job', 'role', 'team', 'work',
  'a', 'an', 'to', 'of', 'in', 'on', 'at', 'is', 'are', 'we', 'us', 'or',
  'this', 'that', 'will', 'your', 'their', 'have', 'has', 'plus', 'etc',
])

/**
 * Pure guard: returns the subset of `tags` worth learning, deduped
 * case-insensitively and capped to the headroom under MAX_CUSTOM_TAGS.
 */
export function filterLearnableTags(tags: string[], existingCount: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of tags) {
    const tag = raw.trim()
    const key = tag.toLowerCase()
    if (tag.length < 2 || tag.length > 30) continue
    if (TAG_STOPWORDS.has(key)) continue
    if (isDictionaryTag(tag)) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
  }
  const headroom = Math.max(0, MAX_CUSTOM_TAGS - existingCount)
  return out.slice(0, headroom)
}

/**
 * Best-effort: persist novel tags for a user. Never throws — a failure is
 * logged and the caller (job save) proceeds unaffected.
 */
export async function learnTags(
  supabase: SupabaseClient,
  userId: string,
  tags: string[],
): Promise<void> {
  try {
    const { data: existing, error: selErr } = await supabase
      .from('user_tags')
      .select('tag')
      .eq('user_id', userId)
    if (selErr) {
      console.error('[tags]', selErr)
      return
    }
    const existingLower = new Set((existing ?? []).map((r) => (r.tag as string).toLowerCase()))
    const learnable = filterLearnableTags(tags, existing?.length ?? 0)
      .filter((t) => !existingLower.has(t.toLowerCase()))
    if (learnable.length === 0) return

    const rows = learnable.map((tag) => ({ user_id: userId, tag }))
    const { error } = await supabase.from('user_tags').insert(rows)
    if (error) console.error('[tags]', error)
  } catch (e) {
    console.error('[tags]', e)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/learn.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tags/learn.ts __tests__/lib/learn.test.ts
git commit -m "feat: tag-learning helper with sanity guards (pure filter + best-effort persist)"
```

---

### Task 5: `GET /api/tags` endpoint

**Files:**
- Create: `app/api/tags/route.ts`

**Interfaces:**
- Produces: `GET /api/tags` → `{ data: string[] }` (the authed user's learned tags, newest first) or `{ error }` with 401/500.

- [ ] **Step 1: Implement the route**

Create `app/api/tags/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_tags')
      .select('tag')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[tags]', error)
      return NextResponse.json({ error: 'Failed to load tags.' }, { status: 500 })
    }

    return NextResponse.json({ data: (data ?? []).map((r) => r.tag as string) })
  } catch (error) {
    console.error('[tags]', error)
    return NextResponse.json({ error: 'Failed to load tags.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean; `/api/tags` listed as a route in the build output.

- [ ] **Step 3: Commit**

```bash
git add app/api/tags/route.ts
git commit -m "feat: GET /api/tags returns the user's learned custom tags"
```

---

### Task 6: Learn tags on job save (POST + PATCH)

**Files:**
- Modify: `app/api/jobs/route.ts` (POST)
- Modify: `app/api/jobs/[id]/route.ts` (PATCH)

**Interfaces:**
- Consumes: `learnTags` from `lib/tags/learn.ts` (Task 4).

- [ ] **Step 1: Wire into POST**

In `app/api/jobs/route.ts`, add the import at the top:

```ts
import { learnTags } from '@/lib/tags/learn'
```

In the `POST` handler, after the insert succeeds and before returning, learn the saved tags. Replace the success tail:

```ts
    if (error) {
      console.error('[jobs]', error)
      return NextResponse.json({ error: 'Failed to save job.' }, { status: 500 })
    }

    await learnTags(supabase, user.id, validation.data.tags ?? [])

    return NextResponse.json({ data })
```

- [ ] **Step 2: Wire into PATCH**

In `app/api/jobs/[id]/route.ts`, add the import at the top:

```ts
import { learnTags } from '@/lib/tags/learn'
```

In the `PATCH` handler, after the update succeeds and before returning, replace the success tail:

```ts
    if (error) {
      console.error('[jobs/id]', error)
      return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 })
    }

    await learnTags(supabase, user.id, validation.data.tags ?? [])

    return NextResponse.json({ data })
```

Note: `validation.data.tags` is `string[] | undefined` in both routes; the `?? []` covers the undefined case. `learnTags` never throws, so this cannot break a save.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/jobs/route.ts "app/api/jobs/[id]/route.ts"
git commit -m "feat: learn novel tags on job create/update (best-effort)"
```

---

### Task 7: `TagsProvider` client context

**Files:**
- Create: `contexts/TagsProvider.tsx`

**Interfaces:**
- Produces:
  - `TagsProvider` — React provider; fetches `/api/tags` once on mount.
  - `useTags(): { customTags: string[]; loading: boolean; refresh: () => Promise<void>; addLocal: (tags: string[]) => void }`

- [ ] **Step 1: Implement the provider**

Create `contexts/TagsProvider.tsx` (mirrors `contexts/JobsProvider.tsx`):

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface TagsListResponse {
  data: string[]
  error?: string
}

export interface TagsContextValue {
  customTags: string[]
  loading: boolean
  refresh: () => Promise<void>
  addLocal: (tags: string[]) => void
}

const TagsContext = createContext<TagsContextValue | null>(null)

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const [customTags, setCustomTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tags')
      const json = (await res.json()) as TagsListResponse
      setCustomTags(res.ok ? json.data : [])
    } catch {
      setCustomTags([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])

  const addLocal = useCallback((tags: string[]) => {
    setCustomTags((prev) => {
      const lower = new Set(prev.map((t) => t.toLowerCase()))
      const additions = tags
        .map((t) => t.trim())
        .filter((t) => t && !lower.has(t.toLowerCase()))
      return additions.length ? [...prev, ...additions] : prev
    })
  }, [])

  const value: TagsContextValue = { customTags, loading, refresh, addLocal }

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>
}

export function useTags() {
  const ctx = useContext(TagsContext)
  if (!ctx) {
    throw new Error('useTags must be used within a TagsProvider')
  }
  return ctx
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add contexts/TagsProvider.tsx
git commit -m "feat: TagsProvider client context for learned custom tags"
```

---

### Task 8: Wire the vocabulary through the UI

**Files:**
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `hooks/useParser.ts`
- Modify: `components/jobs/ParseInput.tsx`
- Modify: `components/jobs/JobForm.tsx`

**Interfaces:**
- Consumes: `TagsProvider`, `useTags` (Task 7); `parseJobDescription(text, customTags)` (Task 2).

- [ ] **Step 1: Wrap the dashboard in `TagsProvider`**

In `app/(dashboard)/layout.tsx`, add the import:

```tsx
import { TagsProvider } from '@/contexts/TagsProvider'
```

Wrap the existing `JobsProvider` subtree with `TagsProvider` (inside `JobsProvider`):

```tsx
  return (
    <JobsProvider>
      <TagsProvider>
        <div className="flex">
          <div className="hidden md:block">
            <SidebarWithReminders />
          </div>
          <div className="flex-1 flex flex-col min-h-screen min-w-0">
            <Topbar profile={profile} email={user!.email ?? ''} />
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
          </div>
          <MobileNav />
        </div>
      </TagsProvider>
    </JobsProvider>
  )
```

- [ ] **Step 2: Thread `customTags` through `useParser`**

Replace `hooks/useParser.ts` `parse` function to accept custom tags:

```ts
  function parse(text: string, customTags: string[] = []) {
    if (!text.trim()) {
      setResult(null)
      return null
    }
    const parsed = parseJobDescription(text, customTags)
    setResult(parsed)
    return parsed
  }
```

- [ ] **Step 3: Pass custom tags from `ParseInput`**

In `components/jobs/ParseInput.tsx`, add the import and read the tags:

```tsx
import { useTags } from '@/contexts/TagsProvider'
```

Inside the component, after `const { result, parse } = useParser()`:

```tsx
  const { customTags } = useTags()
```

In `handleExtract`, change the parse call:

```tsx
    const parsed = parse(text, customTags)
```

- [ ] **Step 4: Learn typed tags locally on save in `JobForm`**

In `components/jobs/JobForm.tsx`, add the import:

```tsx
import { useTags } from '@/contexts/TagsProvider'
```

Inside the component (near the other hooks):

```tsx
  const { addLocal } = useTags()
```

In `handleSubmit`, after `await onSubmit(values)` succeeds (still inside the `try`), record typed tags for instant in-session recognition:

```tsx
    try {
      await onSubmit(values)
      addLocal(values.tags.split(',').map((t) => t.trim()).filter(Boolean))
    } catch {
      setError('Could not save job. Try again.')
    } finally {
      setSaving(false)
    }
```

- [ ] **Step 5: Verify build + full test suite**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Expected: all clean/green.

- [ ] **Step 6: Live verification**

Start `npm run dev`, sign in as the test user, and confirm end-to-end:
1. `/jobs/new` → paste a JD containing a novel skill not in the dictionary (e.g. "Experience with Snowflake and dbt") → Extract → save the job. Novel tokens land in the Tags field only if typed there; the dictionary ones auto-extract.
2. Add "Snowflake" to the Tags field manually, save.
3. Reload, go to `/jobs/new`, paste another JD mentioning "Snowflake" → Extract → confirm **Snowflake** now auto-appears as a tag (proof the learned tag round-tripped through `/api/tags`).
4. Check the network tab: one `GET /api/tags` on dashboard load; `GET /api/jobs` unaffected.
5. Delete any throwaway test job created during verification.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/layout.tsx" hooks/useParser.ts components/jobs/ParseInput.tsx components/jobs/JobForm.tsx
git commit -m "feat: supply learned custom tags to the parser and learn typed tags in-session"
```

---

## Self-Review

**Spec coverage:**
- Externalized dictionary + normalized matching → Task 1. ✓
- `extractTags(text, customTags)` + remove `KNOWN_TAGS` → Task 2. ✓
- `user_tags` table + RLS → Task 3. ✓
- `learnTags` + sanity guards + cap → Task 4. ✓
- `GET /api/tags` → Task 5. ✓
- Learn on POST + PATCH, best-effort → Task 6. ✓
- `TagsProvider` + `useTags`, mount fetch, `addLocal` → Task 7. ✓
- Wire layout / useParser / ParseInput / JobForm → Task 8. ✓
- Error handling (tags=[] on GET fail; learn logs and never blocks) → Tasks 4, 5, 7. ✓
- Tests: skills / parser / learn → Tasks 1, 2, 4. ✓

**Type consistency:** `matchDictionary`, `matchCustomTags`, `normalizeTag`, `isDictionaryTag` (Task 1) are consumed with matching signatures in Tasks 2 and 4. `filterLearnableTags`/`learnTags` (Task 4) consumed in Task 6. `useTags` shape (Task 7) consumed in Task 8. `parseJobDescription(text, customTags?)` (Task 2) consumed in `useParser` (Task 8). Consistent.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; the dictionary is a concrete file, not "fill to N".
