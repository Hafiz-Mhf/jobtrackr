# Scalable JD Tag Extraction — Design

**Date:** 2026-07-04
**Status:** Approved, ready for implementation plan

## Problem

JD tag extraction currently relies on a hardcoded `KNOWN_TAGS` array (~50 entries) in `lib/constants.ts`, filtered with one `new RegExp` per tag per call. This has three problems:

1. **Content coupled to code** — growing the vocabulary means editing source.
2. **Small & static** — anything not in the list is missed; no long-tail coverage.
3. **No synonyms/normalization** — `k8s`, `reactjs`, `JS`, `REACT` all fail to match or produce inconsistent casing.
4. **Matching cost** — O(tags) separate regex scans per parse won't scale as the list grows.

## Goals

- Decouple the skills vocabulary from code (data file, not a source array).
- Normalize aliases and casing to a canonical form (`reactjs` → `React`).
- Make the vocabulary **self-growing per user**: the app learns tags a user adds and recognizes them on future parses, following the user across devices.
- Keep extraction **client-side and instant** (per CLAUDE.md — no AI API, no added latency).

## Non-goals (YAGNI)

- Tag management UI / alias editing.
- Cross-user (global) learning or analytics.
- Server-side extraction.

## Constraints

- **No external AI API** (CLAUDE.md). Extraction stays deterministic/heuristic.
- Parser runs client-side (`ParseInput`) — the instant paste→extract UX must be preserved.
- Supabase with per-operation RLS policies; service-role key stays server-only.

## Approach (chosen: A)

Client-side matching against a bundled dictionary **plus** the user's learned custom tags, with a shared `TagsProvider` supplying the custom set to the browser and the server owning persistence.

Rejected alternatives:
- **B — server-side extraction:** adds latency, breaks instant UX, contradicts client-side directive.
- **C — fold into `JobsProvider`:** conflates jobs data with the tag vocabulary; keep the boundary clean.

## Data Model

New table `user_tags`, applied via `supabase/migrations/0004_user_tags.sql`:

```sql
create table public.user_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tag        text not null,
  created_at timestamptz not null default now()
);

-- One row per (user, tag) regardless of casing
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

- No `update` policy — tags are insert/delete only.
- `tag` is stored as the user typed it (canonical display form); the lower-index enforces case-insensitive dedup.
- Migration is applied to the live project only after spec approval.

## Dictionary + Matching Module

**`lib/data/skills.json`** — ~250 curated tech + business skills. Entry shape:

```json
[
  { "canonical": "React", "aliases": ["reactjs", "react.js"] },
  { "canonical": "JavaScript", "aliases": ["js", "ecmascript"] },
  { "canonical": "Kubernetes", "aliases": ["k8s", "kube"] },
  { "canonical": "Power BI", "aliases": ["powerbi"] }
]
```

**`lib/skills.ts`** — built once at module load:

- `ALIAS_TO_CANONICAL: Map<string, string>` — every canonical and alias, lowercased → canonical.
- `isDictionaryTag(tag: string): boolean` — lowercased membership check (used by the learner to skip built-ins).
- `matchDictionary(text: string): string[]` — word-boundary match across entries, returns canonical forms. Single pass over the entry set, not a fresh `new RegExp` per tag per call.
- `normalizeTag(raw: string): string` — if `raw` (lowercased) is a known alias/canonical → its canonical; else the trimmed `raw` unchanged (custom tags pass through as typed).

**`extractTags(text: string, customTags: string[] = []): string[]`** in `lib/parser.ts`:

1. `matchDictionary(text)`.
2. Match each `customTags` entry against `text` (word-boundary, case-insensitive).
3. Merge → `normalizeTag` each → dedup preserving first-seen order.

With `customTags` empty, output equals the pre-existing dictionary-only behavior.

`KNOWN_TAGS` is **removed** from `lib/constants.ts`; importers move to `lib/skills.ts`.

## API Layer

**`app/api/tags/route.ts`**
- `GET` → `select tag from user_tags where user_id = auth.uid()` (RLS-scoped) → `{ data: string[] }`.

**`lib/tags/learn.ts`** — `learnTags(supabase, userId, tags: string[]): Promise<void>`:
- Diff incoming tags against the dictionary (skip `isDictionaryTag`).
- Sanity guards: trim; length 2–30; not in `TAG_STOPWORDS`; drop dupes.
- Cap: if the user is already at `MAX_CUSTOM_TAGS` (500), skip.
- `upsert` with conflict-ignore (the lower-index dedups).
- Best-effort: wrapped in try/catch, logs `[tags]` on failure, **never blocks the job save**.

**`/api/jobs` POST + PATCH** — after the job row is written, call `learnTags(...)` with the saved `tags`. A learn failure logs but the saved job is still returned.

## Client Integration

**`contexts/TagsProvider.tsx`** (mirrors `JobsProvider`):
- State: `customTags: string[]`, `loading`.
- `refresh()` → `GET /api/tags` on mount, via `void Promise.resolve().then(refresh)` (the deferral pattern that avoids the `react-hooks/set-state-in-effect` lint).
- `addLocal(tags: string[])` — optimistic in-session merge so a just-typed tag is recognized immediately, before the server round-trip.
- Exported `useTags()` hook. `TagsProvider` wraps inside the existing `JobsProvider` in `app/(dashboard)/layout.tsx`.

**`hooks/useParser.ts`** — `parse` gains a second arg `customTags`.

**`components/jobs/ParseInput.tsx`** — reads `useTags().customTags`, passes to `parse(text, customTags)`.

**`components/jobs/JobForm.tsx`** — on submit, `addLocal(newlyTypedTags)` for instant client feedback; the server persists as source of truth on save. The local merge is non-blocking.

## Error Handling

- `GET /api/tags` fails → `TagsProvider` sets `customTags = []`; parser degrades to dictionary-only, no user-facing error.
- `learnTags` fails → logged `[tags]`; job save still succeeds. Learning is never on the critical path.
- Guards reject junk silently — a skipped tag is not an error.

## Testing

Vitest, alongside existing `__tests__/lib/`:

- **`skills.test.ts`** — alias→canonical normalization; word-boundary (no `Reactive` → `React`); multi-word (`Power BI`); dedup.
- **`parser.test.ts`** (extend) — `extractTags` merges custom tags, normalizes, dedups; empty custom = unchanged. All current parser tests stay green.
- **`learn.test.ts`** — guards reject stopword/too-short/too-long/over-cap; dictionary tags skipped; dedup.

## Affected / New Files

**New:**
- `supabase/migrations/0004_user_tags.sql`
- `lib/data/skills.json`
- `lib/skills.ts`
- `lib/tags/learn.ts`
- `app/api/tags/route.ts`
- `contexts/TagsProvider.tsx`
- `__tests__/lib/skills.test.ts`, `__tests__/lib/learn.test.ts` (+ extend `parser.test.ts`)

**Changed:**
- `lib/parser.ts` (`extractTags` signature)
- `lib/constants.ts` (remove `KNOWN_TAGS`)
- `hooks/useParser.ts`
- `components/jobs/ParseInput.tsx`
- `components/jobs/JobForm.tsx`
- `app/api/jobs/route.ts` (POST) and `app/api/jobs/[id]/route.ts` (PATCH)
- `app/(dashboard)/layout.tsx`
