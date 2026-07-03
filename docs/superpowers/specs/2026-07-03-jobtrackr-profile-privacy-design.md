# JobTrackr — Profile, Logout & Privacy Design

> Status: Approved by user, pending write-up review
> Supersedes: none (extends `2026-07-03-jobtrackr-mvp-design.md`)

## Problem

The MVP shipped auth (login/signup/Google OAuth) with no way to log out, no profile
page, and no privacy-facing features, despite the app collecting personal data
(email, password, and — with this feature — name and avatar image).

## Goals

1. Let a signed-in user log out.
2. Let a user view/edit their name and avatar image.
3. Give users visibility and control over their data: a Privacy Policy, consent
   at signup, self-service account deletion, and a data export.

## Non-goals

- Editing email or changing password from the profile page (out of scope —
  email changes require Supabase's email-confirmation flow; password change
  can be a follow-up).
- Soft-delete / grace-period account deletion (deletion is immediate).
- Consent-timestamp tracking in the database (the checkbox is a UX/legal gate
  only for this iteration).
- Automated tests beyond the existing project conventions (this feature is
  mostly CRUD + one DB trigger, not pure-function logic).

## Data Model

New `profiles` table, one row per `auth.users` row, auto-created via trigger:

```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "select own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);

create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Avatar images: new **`avatars` Storage bucket**, public-read, path
`{user_id}/avatar.{ext}` (unguessable path via user id; overwritten on
re-upload). Storage policies restrict write access to the owning
`auth.uid()`. `profiles.avatar_url` stores the resulting public URL.

## TypeScript Types

Add to `types/index.ts`:

```ts
export interface Profile {
  id: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}
```

## Consent & Privacy Policy

- New public page `app/privacy/page.tsx` — static text covering: what's
  collected (email, password [never touched by app code — Supabase-managed],
  name, avatar image), why, what's explicitly *not* collected (no SSN,
  financial, or health data, no tracking beyond running the product), and how
  to delete/export data.
- `app/(auth)/login/page.tsx`, sign-up mode only: required checkbox — "I
  agree to the [Privacy Policy](/privacy)" — submit disabled until checked.
- Google OAuth button: small line shown in both modes — "By continuing you
  agree to our [Privacy Policy](/privacy)" (this is the consent surface for
  the OAuth path, which has no separate signup step).

## Profile Page

`app/(dashboard)/profile/page.tsx`:

- Avatar (or initials-circle fallback, matching the existing sidebar
  placeholder style) + "Change photo" file picker. Client validates type
  (jpg/png/webp) and size (≤2MB) before upload; uploads to
  `avatars/{user_id}/avatar.{ext}`; updates `profiles.avatar_url`.
- Name field, editable; Save calls `PATCH /api/profile` (allowlisted input,
  same pattern as `/api/jobs`).
- Email shown read-only (from `auth.users`), with a note that it's managed
  via the sign-in method.
- "Danger zone" section: **Delete my account** and **Download my data**.
- Standard loading/error states per project convention.

## Logout & Topbar User Menu

`components/layout/Topbar.tsx`:

- User menu button (avatar/initials + name) added to the Topbar, alongside
  the existing "Add Job" button. Opens a dropdown: **Profile**, **Logout**.
- Logout: `supabase.auth.signOut()` then `window.location.href = '/login'`
  (full reload, matching the existing sign-in flow, so `proxy.ts` re-checks
  cleanly).
- Profile (name + avatar) fetched once in `app/(dashboard)/layout.tsx`
  (Server Component, alongside the existing `getUser()` call) and passed
  down to Topbar — no extra client-side fetch.

## Account Deletion

- Confirm dialog: type `DELETE` into a text input to enable the confirm
  button (no password re-entry — works identically for email/password and
  Google-authenticated users, since deletion doesn't depend on the auth
  method).
- `DELETE /api/profile` (server route):
  1. Best-effort removal of the user's avatar file from Storage.
  2. `supabase.auth.admin.deleteUser(userId)` via the **service-role
     client** — cascades to `profiles` and `jobs` via existing FKs, and
     removes any linked OAuth identity (e.g. Google) automatically.
  3. Client signs out, redirects to `/login`, toast: "Your account has been
     deleted."
- This route is the sole sanctioned use of `SUPABASE_SERVICE_ROLE_KEY`,
  server-only, never exposed to the client — consistent with the existing
  "never expose service-role key" rule.

## Data Export

- `GET /api/profile/export` (authenticated): queries the user's `profiles`
  row and all their `jobs` rows (RLS-scoped to their own data), returns
  `{ profile: {...}, jobs: [...] }` as a downloadable JSON file
  (`Content-Disposition: attachment; filename="jobtrackr-export.json"`).
- Synchronous response — data volume per user is small enough that no
  background job is needed.

## Error Handling

- New API routes follow existing convention: `[route-name]`-prefixed server
  logs, human-readable client-facing errors, allowlisted input fields only.
- Avatar upload validated client-side (type/size) and the resulting URL
  sanity-checked server-side before persisting.

## Affected/New Files

- `supabase/migrations/0002_profiles.sql` (new)
- `types/index.ts` (extend)
- `app/privacy/page.tsx` (new)
- `app/(auth)/login/page.tsx` (edit — consent checkbox/line)
- `app/(dashboard)/profile/page.tsx` (new)
- `app/(dashboard)/layout.tsx` (edit — fetch profile, pass to Topbar)
- `components/layout/Topbar.tsx` (edit — user menu, logout)
- `app/api/profile/route.ts` (new — PATCH, DELETE)
- `app/api/profile/export/route.ts` (new — GET)
- `lib/supabase/admin.ts` (new — service-role client, server-only, used
  exclusively by the DELETE route)
