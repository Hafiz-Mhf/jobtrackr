# JobTrackr — Profile, Logout & Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add logout, a profile page (name + avatar), and privacy features (consent, Privacy Policy page, self-service account deletion, data export) to JobTrackr.

**Architecture:** A new `profiles` table (one row per auth user, auto-created via trigger) backs a `/profile` page and a Topbar user menu. Avatar images upload directly from the browser to a Supabase Storage bucket using RLS-style storage policies. Account deletion is the one place the service-role key is used, isolated to a single server route.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Auth + Storage), `@base-ui/react` (already a dependency via `components/ui/button.tsx` — use its `Menu`, `AlertDialog`, and `Avatar` primitives; do not add a new package), sonner (toast), Vitest.

## Global Constraints

- No `any` — proper types or generics only.
- Server Components by default; `'use client'` only where interactivity/hooks are needed.
- Named exports for components, default exports for pages.
- No inline styles — Tailwind utility classes only.
- API routes: allowlisted input fields only, never spread raw request bodies into a DB call.
- `[route-name]`-prefixed server-side error logs; human-readable client-facing error messages.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client — server-only, isolated to the one route in this plan that needs it.
- Per-operation RLS policies (`select`/`insert`/`update`, not one blanket `for all`), matching the existing `jobs` table pattern.
- No `dangerouslySetInnerHTML` on user-supplied text.
- Do not install new npm packages — `@base-ui/react` is already installed; every new UI primitive needed (menu, alert-dialog, avatar) is already part of it.

---

### Task 1: Apply the `profiles` table + avatars storage bucket migration (controller-run)

This task is infrastructure, not application code — run it directly against the Supabase project (the same way the `0001_init.sql` migration and project setup were done), not delegated to a code-writing subagent.

**Files:**
- Create: `supabase/migrations/0002_profiles.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/0002_profiles.sql

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can select their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created (email/password or OAuth)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Avatar storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Apply the migration**

Apply it to the live Supabase project (`apgdyaiztmsnohakjkfg`, `ap-southeast-1`) using the Supabase MCP `apply_migration` tool, the same way `0001_init.sql` was applied.

- [ ] **Step 3: Verify**

Use the Supabase MCP `list_tables` tool and confirm `profiles` appears with RLS enabled, and confirm the `avatars` bucket exists via `list_extensions`/the dashboard.

- [ ] **Step 4: Provide the service-role key**

`SUPABASE_SERVICE_ROLE_KEY` is currently blank in `.env.local` (intentionally, from initial setup). Task 4 needs it. Fetch it from the Supabase dashboard (Project Settings → API → `service_role` secret) and:
1. Add it to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=<value>`
2. Add it to Vercel: `vercel env add SUPABASE_SERVICE_ROLE_KEY production` (paste the value when prompted, do NOT print it to logs).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_profiles.sql
git commit -m "feat: add profiles table, auto-create trigger, and avatars storage bucket"
```

---

### Task 2: Add `Profile` type and profile-related constants

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/constants.ts`

**Interfaces:**
- Produces: `Profile` interface, `MAX_NAME_LENGTH` constant — consumed by Tasks 3, 5, 9, 11, 12.

- [ ] **Step 1: Add the `Profile` type**

Append to `types/index.ts`:

```ts
export interface Profile {
  id: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Add the name length constant**

Add to `lib/constants.ts` (alongside the existing `MAX_FIELD_LENGTH`, `MAX_TEXT_LENGTH`):

```ts
export const MAX_NAME_LENGTH = 100
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/constants.ts
git commit -m "feat: add Profile type and MAX_NAME_LENGTH constant"
```

---

### Task 3: Pure validation/avatar-path helpers (TDD)

**Files:**
- Create: `lib/validation.ts`
- Create: `lib/avatar.ts`
- Test: `__tests__/lib/validation.test.ts`
- Test: `__tests__/lib/avatar.test.ts`

**Interfaces:**
- Consumes: `MAX_NAME_LENGTH` from `lib/constants.ts` (Task 2).
- Produces: `validateFullName(name: unknown): string | null`, `AVATAR_MAX_BYTES: number`, `AVATAR_ALLOWED_TYPES: readonly string[]`, `validateAvatarFile(file: { type: string; size: number }): string | null` from `lib/validation.ts`; `AVATAR_BUCKET: 'avatars'`, `getAvatarExtension(mimeType: string): string | null`, `getAvatarPath(userId: string, mimeType: string): string` from `lib/avatar.ts`. Consumed by Task 5 (server route) and Task 9 (client upload).

- [ ] **Step 1: Write the failing tests**

`__tests__/lib/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateFullName, validateAvatarFile, AVATAR_MAX_BYTES } from '@/lib/validation'

describe('validateFullName', () => {
  it('rejects empty string', () => {
    expect(validateFullName('')).toBe('Name is required.')
  })

  it('rejects whitespace-only string', () => {
    expect(validateFullName('   ')).toBe('Name is required.')
  })

  it('rejects non-string input', () => {
    expect(validateFullName(123)).toBe('Name is required.')
  })

  it('rejects a name over 100 characters', () => {
    expect(validateFullName('a'.repeat(101))).toBe('Name must be under 100 characters.')
  })

  it('accepts a valid name', () => {
    expect(validateFullName('Ada Lovelace')).toBeNull()
  })
})

describe('validateAvatarFile', () => {
  it('rejects a disallowed file type', () => {
    expect(validateAvatarFile({ type: 'image/gif', size: 1000 })).toBe(
      'Please upload a JPG, PNG, or WebP image.'
    )
  })

  it('rejects a file over the size limit', () => {
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 })).toBe(
      'Image must be under 2MB.'
    )
  })

  it('accepts a valid png under the limit', () => {
    expect(validateAvatarFile({ type: 'image/png', size: 1024 })).toBeNull()
  })

  it('accepts a file exactly at the size limit', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: AVATAR_MAX_BYTES })).toBeNull()
  })
})
```

`__tests__/lib/avatar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getAvatarExtension, getAvatarPath, AVATAR_BUCKET } from '@/lib/avatar'

describe('getAvatarExtension', () => {
  it('maps image/jpeg to jpg', () => {
    expect(getAvatarExtension('image/jpeg')).toBe('jpg')
  })

  it('maps image/png to png', () => {
    expect(getAvatarExtension('image/png')).toBe('png')
  })

  it('maps image/webp to webp', () => {
    expect(getAvatarExtension('image/webp')).toBe('webp')
  })

  it('returns null for an unsupported type', () => {
    expect(getAvatarExtension('image/gif')).toBeNull()
  })
})

describe('getAvatarPath', () => {
  it('builds a path scoped to the user id', () => {
    expect(getAvatarPath('user-123', 'image/png')).toBe('user-123/avatar.png')
  })
})

describe('AVATAR_BUCKET', () => {
  it('is the avatars bucket', () => {
    expect(AVATAR_BUCKET).toBe('avatars')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/validation.test.ts __tests__/lib/avatar.test.ts`
Expected: FAIL — `Cannot find module '@/lib/validation'` / `'@/lib/avatar'`.

- [ ] **Step 3: Implement `lib/validation.ts`**

```ts
import { MAX_NAME_LENGTH } from '@/lib/constants'

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export function validateFullName(name: unknown): string | null {
  if (typeof name !== 'string' || !name.trim()) {
    return 'Name is required.'
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Name must be under ${MAX_NAME_LENGTH} characters.`
  }
  return null
}

export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    return 'Please upload a JPG, PNG, or WebP image.'
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'Image must be under 2MB.'
  }
  return null
}
```

- [ ] **Step 4: Implement `lib/avatar.ts`**

```ts
export const AVATAR_BUCKET = 'avatars'

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function getAvatarExtension(mimeType: string): string | null {
  return EXTENSION_BY_MIME_TYPE[mimeType] ?? null
}

export function getAvatarPath(userId: string, mimeType: string): string {
  const extension = getAvatarExtension(mimeType) ?? 'jpg'
  return `${userId}/avatar.${extension}`
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/validation.test.ts __tests__/lib/avatar.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/validation.ts lib/avatar.ts __tests__/lib/validation.test.ts __tests__/lib/avatar.test.ts
git commit -m "feat: add profile name and avatar validation helpers"
```

---

### Task 4: Service-role Supabase client (server-only)

**Files:**
- Create: `lib/supabase/admin.ts`

**Interfaces:**
- Produces: `createAdminClient(): SupabaseClient` — consumed exclusively by Task 5's `DELETE /api/profile` handler. Never imported from a Client Component.

- [ ] **Step 1: Implement the admin client**

```ts
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/admin.ts
git commit -m "feat: add service-role Supabase admin client for server-only use"
```

---

### Task 5: `/api/profile` route — PATCH (update) and DELETE (account deletion)

**Files:**
- Create: `app/api/profile/route.ts`

**Interfaces:**
- Consumes: `validateFullName` from `lib/validation.ts` (Task 3), `createClient` from `lib/supabase/server.ts`, `createAdminClient` from `lib/supabase/admin.ts` (Task 4), `Profile` type (Task 2).
- Produces: `PATCH /api/profile` accepting `{ full_name?: string; avatar_url?: string }`, returns `{ data: Profile }` or `{ error: string }`. `DELETE /api/profile` returns `{ data: { id: string } }` or `{ error: string }`. Consumed by Task 9 (PATCH) and Task 10 (DELETE).

- [ ] **Step 1: Implement the route**

```ts
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateFullName } from '@/lib/validation'

interface PatchProfileData {
  full_name?: string
  avatar_url?: string
  updated_at: string
}

function validatePatchInput(
  body: unknown
): { valid: true; data: PatchProfileData } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  if (b.full_name !== undefined) {
    const nameError = validateFullName(b.full_name)
    if (nameError) {
      return { valid: false, error: nameError }
    }
  }
  if (b.avatar_url !== undefined && typeof b.avatar_url !== 'string') {
    return { valid: false, error: 'Invalid avatar URL.' }
  }

  // Allowlisted update — only these fields (plus a server-set timestamp) ever reach the DB.
  const data: PatchProfileData = { updated_at: new Date().toISOString() }
  if (typeof b.full_name === 'string') {
    data.full_name = b.full_name.trim()
  }
  if (typeof b.avatar_url === 'string') {
    data.avatar_url = b.avatar_url
  }

  return { valid: true, data }
}

export async function PATCH(req: NextRequest) {
  try {
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
      .from('profiles')
      .update(validation.data)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[profile]', error)
      return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[profile]', error)
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Best-effort avatar cleanup — account deletion must not fail if this fails.
    await admin.storage.from('avatars').remove([
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.png`,
      `${user.id}/avatar.webp`,
    ])

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('[profile]', error)
      return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
    }

    return NextResponse.json({ data: { id: user.id } })
  } catch (error) {
    console.error('[profile]', error)
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign in as the test user (`zlatanmovic38@gmail.com` / `testuser1234`), then from the browser console on the app's origin:

```js
await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: 'Test User' }) }).then(r => r.json())
```

Expected: `{ data: { id: ..., full_name: 'Test User', ... } }`. Confirm in the Supabase dashboard that `profiles.full_name` updated for that user. Do not run the `DELETE` call yet — Tasks 9/10 give it a proper UI; deleting now would remove the test account.

- [ ] **Step 4: Commit**

```bash
git add app/api/profile/route.ts
git commit -m "feat: add PATCH/DELETE /api/profile routes for profile update and account deletion"
```

---

### Task 6: `/api/profile/export` route — data export

**Files:**
- Create: `app/api/profile/export/route.ts`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/server.ts`.
- Produces: `GET /api/profile/export` returning a downloadable JSON file `{ profile: Profile, jobs: Job[] }` — consumed by Task 10's "Download my data" button.

- [ ] **Step 1: Implement the route**

```ts
// app/api/profile/export/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const [{ data: profile, error: profileError }, { data: jobs, error: jobsError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
    ])

    if (profileError || jobsError) {
      console.error('[profile/export]', profileError ?? jobsError)
      return NextResponse.json({ error: 'Failed to export data.' }, { status: 500 })
    }

    const exportPayload = { profile, jobs }

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="jobtrackr-export.json"',
      },
    })
  } catch (error) {
    console.error('[profile/export]', error)
    return NextResponse.json({ error: 'Failed to export data.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

With the dev server running and signed in as the test user, navigate the browser directly to `http://localhost:3000/api/profile/export` — expect a file download (or inline JSON display) containing `{ "profile": {...}, "jobs": [...] }` scoped to that user only.

- [ ] **Step 4: Commit**

```bash
git add app/api/profile/export/route.ts
git commit -m "feat: add GET /api/profile/export data export route"
```

---

### Task 7: Privacy Policy page

**Files:**
- Create: `app/privacy/page.tsx`

- [ ] **Step 1: Implement the page**

```tsx
// app/privacy/page.tsx
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-brand-bg px-4 py-12">
      <div className="max-w-2xl mx-auto bg-surface border border-[var(--color-border)] rounded-xl p-8 space-y-6">
        <div>
          <Link href="/login" className="text-sm text-accent">
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold text-brand-text mt-2">Privacy Policy</h1>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wide">
            What we collect
          </h2>
          <p className="text-sm text-brand-muted">
            To run JobTrackr we collect your email address and password (handled entirely
            by our authentication provider — we never see or store your password
            ourselves), and, if you choose to add them, your name and a profile photo.
            We also store the job applications you add: company, role, status, and any
            notes you write.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wide">
            What we don&apos;t collect
          </h2>
          <p className="text-sm text-brand-muted">
            We never ask for or store sensitive information — no government ID numbers,
            no financial account details, no health information. We don&apos;t track you
            across other sites.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wide">
            Your data, your control
          </h2>
          <p className="text-sm text-brand-muted">
            From your Profile page you can update your name and photo, download a copy
            of everything we have on you, or permanently delete your account and all
            associated data at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wide">
            Questions
          </h2>
          <p className="text-sm text-brand-muted">
            Contact the site owner via the email associated with this domain.
          </p>
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: `/privacy` appears in the route list as a static (`○`) page.

- [ ] **Step 3: Commit**

```bash
git add app/privacy/page.tsx
git commit -m "feat: add static Privacy Policy page"
```

---

### Task 8: Consent checkbox and Google OAuth privacy line on the login page

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Add consent state**

In `app/(auth)/login/page.tsx`, add a new state variable alongside the existing `email`/`password` state (after line 11, `const [loading, setLoading] = useState(false)`):

```tsx
const [consentChecked, setConsentChecked] = useState(false)
```

- [ ] **Step 2: Block sign-up submission without consent**

In `handleEmailAuth`, right after `setLoading(true)` inside the `if (mode === 'sign-up')` block (before the `supabase.auth.signUp` call), add:

```tsx
if (!consentChecked) {
  setLoading(false)
  setError('Please agree to the Privacy Policy to create an account.')
  return
}
```

- [ ] **Step 3: Add the privacy line under the Google button**

Immediately after the closing `</button>` of the "Continue with Google" button (currently ending the block at line 79), add:

```tsx
<p className="text-xs text-brand-muted text-center mb-4">
  By continuing you agree to our{' '}
  <a href="/privacy" target="_blank" className="text-accent underline">
    Privacy Policy
  </a>
  .
</p>
```

- [ ] **Step 4: Add the consent checkbox to the sign-up form**

Inside the `<form>`, immediately before the `{error && ...}` line (currently line 99), add a block shown only in sign-up mode:

```tsx
{mode === 'sign-up' && (
  <label className="flex items-start gap-2 text-xs text-brand-muted">
    <input
      type="checkbox"
      checked={consentChecked}
      onChange={(e) => setConsentChecked(e.target.checked)}
      className="mt-0.5"
    />
    <span>
      I agree to the{' '}
      <a href="/privacy" target="_blank" className="text-accent underline">
        Privacy Policy
      </a>
      .
    </span>
  </label>
)}
```

- [ ] **Step 5: Disable submit until consent is given in sign-up mode**

Change the submit button's `disabled` prop from `disabled={loading}` to:

```tsx
disabled={loading || (mode === 'sign-up' && !consentChecked)}
```

- [ ] **Step 6: Verify it compiles and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run `npm run dev`, open `/login`, switch to sign-up mode: confirm the checkbox appears and the submit button stays disabled until checked. Confirm the Google button's privacy line shows in both modes and `/privacy` opens in a new tab.

- [ ] **Step 8: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat: require privacy policy consent on sign-up, add consent line for Google auth"
```

---

### Task 9: `ProfileForm` component — edit name and avatar

**Files:**
- Create: `components/profile/ProfileForm.tsx`

**Interfaces:**
- Consumes: `Profile` type (Task 2), `validateFullName`/`validateAvatarFile` (Task 3), `getAvatarPath`/`AVATAR_BUCKET` (Task 3), `createClient` from `lib/supabase/client.ts`, `cn` from `lib/utils.ts`, `@base-ui/react/avatar`, `PATCH /api/profile` (Task 5).
- Produces: `ProfileForm` component with props `{ profile: Profile; email: string }` — consumed by Task 11.

- [ ] **Step 1: Implement the component**

```tsx
// components/profile/ProfileForm.tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@base-ui/react/avatar'
import { createClient } from '@/lib/supabase/client'
import { validateFullName, validateAvatarFile } from '@/lib/validation'
import { getAvatarPath, AVATAR_BUCKET } from '@/lib/avatar'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  email: string
}

export function ProfileForm({ profile, email }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const fileError = validateAvatarFile(file)
    if (fileError) {
      setError(fileError)
      return
    }

    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')

      const path = getAvatarPath(user.id, file.type)
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      const bustedUrl = `${publicUrl}?t=${Date.now()}`

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: bustedUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setAvatarUrl(bustedUrl)
      toast.success('Photo updated.')
    } catch {
      setError("Couldn't upload photo. Try again.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const nameError = validateFullName(fullName)
    if (nameError) {
      setError(nameError)
      return
    }

    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Profile updated.')
    } catch {
      setError("Couldn't save changes. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const initials = (fullName || email).slice(0, 1).toUpperCase()

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-md">
      <div className="flex items-center gap-4">
        <Avatar.Root className="size-16 rounded-full overflow-hidden bg-accent-light flex items-center justify-center text-accent font-semibold text-xl">
          <Avatar.Image src={avatarUrl} alt="" className="size-full object-cover" />
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar.Root>
        <label className="text-sm font-medium text-accent cursor-pointer">
          {uploading ? 'Uploading…' : 'Change photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-brand-text">Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-brand-text">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-surface-muted text-brand-muted"
        />
        <p className="text-xs text-brand-muted">Managed via your sign-in method.</p>
      </div>

      {error && <p className="text-sm text-[var(--color-rejected)]">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-accent text-white rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/profile/ProfileForm.tsx
git commit -m "feat: add ProfileForm for editing name and avatar"
```

---

### Task 10: `DangerZone` component — account deletion and data export

**Files:**
- Create: `components/profile/DangerZone.tsx`

**Interfaces:**
- Consumes: `AlertDialog` from `@base-ui/react/alert-dialog`, `DELETE /api/profile` (Task 5), `GET /api/profile/export` (Task 6).
- Produces: `DangerZone` component (no props) — consumed by Task 11.

- [ ] **Step 1: Implement the component**

```tsx
// components/profile/DangerZone.tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { createClient } from '@/lib/supabase/client'

export function DangerZone() {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/profile', { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Your account has been deleted.')
      window.location.href = '/login'
    } catch {
      toast.error("Couldn't delete account. Try again.")
      setDeleting(false)
    }
  }

  async function handleExport() {
    window.location.href = '/api/profile/export'
  }

  return (
    <div className="max-w-md border border-[var(--color-rejected)]/30 rounded-lg p-4 space-y-4">
      <h2 className="text-sm font-semibold text-[var(--color-rejected)] uppercase tracking-wide">
        Danger zone
      </h2>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-brand-text">Download my data</p>
          <p className="text-xs text-brand-muted">Export your profile and job data as JSON.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm font-medium"
        >
          Download
        </button>
      </div>

      <AlertDialog.Root>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-text">Delete my account</p>
            <p className="text-xs text-brand-muted">
              Permanently deletes your account and all your job data.
            </p>
          </div>
          <AlertDialog.Trigger className="bg-[var(--color-rejected)] text-white rounded-md px-3 py-1.5 text-sm font-medium">
            Delete account
          </AlertDialog.Trigger>
        </div>

        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-xl p-6 w-full max-w-sm space-y-4">
            <AlertDialog.Title className="text-base font-semibold text-brand-text">
              Delete your account?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-brand-muted">
              This permanently deletes your account and every job you&apos;ve saved. This
              cannot be undone. Type <strong>DELETE</strong> to confirm.
            </AlertDialog.Description>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm"
              placeholder="DELETE"
            />
            <div className="flex justify-end gap-2">
              <AlertDialog.Close className="border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm font-medium">
                Cancel
              </AlertDialog.Close>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                className="bg-[var(--color-rejected)] text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/profile/DangerZone.tsx
git commit -m "feat: add DangerZone component for account deletion and data export"
```

---

### Task 11: `/profile` page

**Files:**
- Create: `app/(dashboard)/profile/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/server.ts`, `ProfileForm` (Task 9), `DangerZone` (Task 10), `Profile` type (Task 2).
- Produces: `/profile` route — consumed by Task 12's Topbar "Profile" link.

- [ ] **Step 1: Implement the page**

```tsx
// app/(dashboard)/profile/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { DangerZone } from '@/components/profile/DangerZone'
import type { Profile } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-xl font-semibold text-brand-text">Profile</h1>
      <ProfileForm
        profile={profile ?? { id: user.id, created_at: user.created_at, updated_at: user.created_at }}
        email={user.email ?? ''}
      />
      <DangerZone />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors; `/profile` appears in the route list as dynamic (`ƒ`).

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign in as the test user, navigate to `/profile`. Confirm the name field, avatar upload, "Download my data", and "Delete account" dialog all render. Update the name and confirm it persists on reload. Do not click "Permanently delete" yet.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/profile/page.tsx"
git commit -m "feat: add /profile page"
```

---

### Task 12: Topbar user menu (Profile link + Logout)

**Files:**
- Modify: `components/layout/Topbar.tsx`
- Modify: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `Profile` type (Task 2), `Menu`/`Avatar` from `@base-ui/react/menu` and `@base-ui/react/avatar`, `/profile` route (Task 11).

- [ ] **Step 1: Rewrite `Topbar` as a client component accepting profile + email props**

Replace the full contents of `components/layout/Topbar.tsx`:

```tsx
// components/layout/Topbar.tsx
'use client'

import Link from 'next/link'
import { Menu } from '@base-ui/react/menu'
import { Avatar } from '@base-ui/react/avatar'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Props {
  profile: Profile | null
  email: string
}

export function Topbar({ profile, email }: Props) {
  const displayName = profile?.full_name || email
  const initials = displayName.slice(0, 1).toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="h-[var(--topbar-height)] border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-surface">
      <input
        type="search"
        placeholder="Search jobs..."
        className="text-sm border border-[var(--color-border)] rounded-md px-3 py-1.5 w-64"
      />
      <div className="flex items-center gap-3">
        <Link
          href="/jobs/new"
          className="bg-accent text-white text-sm font-semibold px-4 py-1.5 rounded-md"
        >
          Add Job
        </Link>

        <Menu.Root>
          <Menu.Trigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-brand-text hover:bg-surface-muted">
            <Avatar.Root className="size-7 rounded-full overflow-hidden bg-accent-light flex items-center justify-center text-accent text-xs font-semibold">
              <Avatar.Image src={profile?.avatar_url ?? ''} alt="" className="size-full object-cover" />
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar.Root>
            <span className="max-w-[120px] truncate">{displayName}</span>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={8} align="end">
              <Menu.Popup className="bg-surface border border-[var(--color-border)] rounded-md shadow-lg py-1 min-w-[160px]">
                <Menu.Item
                  render={<Link href="/profile" />}
                  className="block px-3 py-2 text-sm text-brand-text hover:bg-surface-muted cursor-pointer"
                >
                  Profile
                </Menu.Item>
                <Menu.Item
                  onClick={handleLogout}
                  className="block px-3 py-2 text-sm text-[var(--color-rejected)] hover:bg-surface-muted cursor-pointer"
                >
                  Logout
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </header>
  )
}
```

Note: `router` is imported but unused above if `window.location.href` is used for the redirect (kept consistent with the existing sign-in flow's full-reload pattern so `proxy.ts` re-checks the session cleanly). Remove the unused `useRouter` import and `const router = ...` line since it's not needed — use only `window.location.href` in `handleLogout`.

- [ ] **Step 2: Fetch the profile in the dashboard layout and pass it to `Topbar`**

In `app/(dashboard)/layout.tsx`, after the existing `const { data: { user } } = await supabase.auth.getUser()` line, add:

```tsx
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user!.id)
  .single()
```

Then change `<Topbar />` to:

```tsx
<Topbar profile={profile} email={user!.email ?? ''} />
```

(`user!` is safe here — the function already `redirect('/login')`s and returns if `!user`, so every line after that point has a non-null `user`.)

- [ ] **Step 3: Verify it compiles and builds**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, sign in as the test user. Confirm the Topbar shows the avatar/initials + name, clicking it opens a dropdown with "Profile" and "Logout", "Profile" navigates to `/profile`, and "Logout" signs out and redirects to `/login` (confirm `/dashboard` then redirects to `/login` if visited again while logged out).

- [ ] **Step 5: Commit**

```bash
git add components/layout/Topbar.tsx "app/(dashboard)/layout.tsx"
git commit -m "feat: add Topbar user menu with Profile link and Logout"
```

---

## Self-Review Notes

- **Spec coverage:** Logout (Task 12), profile view/edit name+avatar (Tasks 9, 11), consent at signup (Task 8), Privacy Policy page (Task 7), account deletion (Tasks 5, 10), data export (Tasks 6, 10), `profiles` table + avatars bucket (Task 1), service-role isolation (Task 4) — all spec sections have a task.
- **No placeholders:** every step has complete code, not a description.
- **Type consistency:** `Profile` (Task 2) is used identically across Tasks 5, 9, 11, 12. `AVATAR_BUCKET`/`getAvatarPath` (Task 3) are used identically in Task 9. `validateFullName`/`validateAvatarFile` (Task 3) are used identically in Tasks 5 and 9.
