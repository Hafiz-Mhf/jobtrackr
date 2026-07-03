# JobTrackr MVP — Implementation Design

> Spec source of truth: `CLAUDE.md` (stack, schema, conventions, scope) and `design.md` (visual/UX). This doc sequences the MVP build.

## Scope

Build the 8 MVP checklist items from `CLAUDE.md`. No features beyond that list. No AI API of any kind — all "smart" behavior is client-side pattern matching (`lib/parser.ts`) and curated static data (`lib/interview-questions.ts`).

## Decisions

- **Auth**: email/password + Google OAuth, per `CLAUDE.md`.
- **Supabase**: new project, set up from scratch (schema, RLS, Google OAuth provider, env vars).
- **Interview question bank**: full coverage — all ~28 tags in `extractTags()` get a curated question set (3-4 questions each), plus the universal behavioral set.
- **Reminders**: computed client-side on load from already-fetched jobs. No cron/server job for MVP.

## Phase Plan (foundation-first)

1. **Scaffold** — Next.js 16 App Router (Turbopack default) + React 19 + TS + Tailwind v4 + shadcn init; folder structure per `CLAUDE.md`; new Supabase project; `jobs` table + RLS policy; `.env.local` wired.
2. **Auth** — Supabase Auth (email/password + Google OAuth) via `@supabase/ssr`; `(auth)/login/page.tsx`, `(auth)/callback/route.ts`; `proxy.ts` (Next 16's renamed middleware) re-validates session on every `(dashboard)` request.
3. **Layout shell** — `Sidebar.tsx`, `Topbar.tsx`, `MobileNav.tsx` per `design.md` tokens; aurora background in `globals.css`; empty dashboard shell.
4. **Parser + Kanban** — `lib/parser.ts` (extractCompany/Role/Salary/Location/Tags), `ParseInput.tsx` with staggered reveal, `JobForm.tsx` manual fallback, `Board.tsx`/`Column.tsx`/`JobCard.tsx` with `@dnd-kit`, `/api/jobs` CRUD route.
5. **Job detail + interview prep** — `app/(dashboard)/jobs/[id]/page.tsx`, `lib/interview-questions.ts` (full tag bank + universal questions), `PrepPanel.tsx` + `QuestionCard.tsx` with slide-in.
6. **Reminders** — `lib/reminders.ts` stale-detection (`status==='applied' && last_updated` > 7 days), `/reminders/page.tsx`, sidebar badge count.
7. **Polish + deploy** — responsive pass (mobile bottom nav), toast wiring per `design.md` event table, empty states, `prefers-reduced-motion`, Vercel deploy with env vars configured.

## Data Flow & Error Handling

- **Jobs CRUD**: client components hit `/api/jobs` (GET/POST/PATCH/DELETE); routes use the Supabase **server** client, RLS scopes rows to `auth.uid()`. Drag-and-drop updates board state optimistically, then PATCHes status; on failure, revert local state and show an error toast.
- **Parser**: pure synchronous function, no network call. Partial extraction pre-fills whatever fields were found and leaves the rest blank for manual entry; UI shows a "some fields couldn't be detected" warning toast rather than failing the flow.
- **Interview prep**: pure lookup against the local `questionBank` map — no async, no real loading state, though the panel still uses the staggered/slide-in motion from `design.md` for polish.
- **Reminders**: derived client-side from jobs already loaded on the dashboard/reminders page — no cron, no server-side scheduled job.
- **Errors**: all API failures surface as human-readable toasts (per the event table in `design.md`); server-side errors are logged with a `[route-name]` prefix and never leak stack traces to the client.

## Security (Auth & Data)

Email/password + Google OAuth means real credentials and PII in play. MVP must ship with:

### Auth hardening

- Supabase email/password: enforce min 8-char passwords, enable Supabase's leaked-password protection (HaveIBeenPwned check).
- Require email verification before a new account can reach `(dashboard)` routes — unverified users redirected back to login with a "check your email" state.
- Google OAuth: use Supabase's default PKCE flow; restrict redirect URLs to an exact allowlist in both the Supabase dashboard and Google Cloud Console (no wildcard domains). Request only `email` + `profile` scopes.
- Generic auth error messages ("invalid email or password") — never reveal whether an email is registered (prevents account enumeration).
- Rely on Supabase's built-in auth rate limiting; if abuse is observed post-launch, add CAPTCHA to signup.

### Session handling

- Use `@supabase/ssr` cookie-based session helpers (not localStorage) so tokens are httpOnly + `Secure` + `SameSite=Lax`.
- Session/refresh handled by Supabase's rotating refresh tokens; sign-out calls `supabase.auth.signOut()` and clears cookies server-side.
- `proxy.ts` (Next 16's renamed `middleware.ts`, exported function `proxy`) re-validates the session on every `(dashboard)` request — no relying on client-only route guards.

### Data access

- Keep RLS enabled on `jobs` (already in schema). Split the current single `for all` policy into explicit `select`/`insert`/`update`/`delete` policies, each checking `auth.uid() = user_id` — clearer to audit than one blanket policy, same effective access.
- `SUPABASE_SERVICE_ROLE_KEY` stays server-only, and MVP has no code path that needs it (RLS covers per-user access) — do not introduce one without flagging it first, per `CLAUDE.md`.
- API routes (`/api/jobs`) validate and cap input server-side (string length limits on `company`/`role`/`notes`/`description`, `status` restricted to the 5 known enum values) before hitting the DB — defense in depth even though RLS scopes rows.
- User-supplied text (JD paste, notes) is only ever rendered through normal React JSX interpolation — no `dangerouslySetInnerHTML`, no raw HTML from user input.

### Transport & secrets

- HTTPS enforced by Vercel by default; no additional config needed.
- `.env.local` stays gitignored (already true); never log secrets or full request bodies in server error logs — the `[route-name]` log prefix logs the error only, not the payload.

## Testing

- Unit tests for `parseJobDescription` and its extraction helpers (company, role, salary, location, tags) — pure functions, high value since parsing accuracy is the core differentiator.
- Unit tests for the stale-application check in `lib/reminders.ts`, including the 7-day boundary.
- No E2E framework in MVP scope. Auth, drag-and-drop, and add-job flows are verified manually in-browser before each phase is marked done.

## Out of Scope (explicitly deferred)

- Any AI/LLM API integration.
- Cron-based or server-side reminder scheduling.
- `interview_prep` DB table (removed per `CLAUDE.md` — prep is derived from `jobs.tags` at render time).
- Anything not on the 8-item MVP checklist in `CLAUDE.md`.
