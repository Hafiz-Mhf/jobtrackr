# JobTrackr MVP — SDD Progress Ledger

Plan: docs/superpowers/plans/2026-07-03-jobtrackr-mvp.md

(Tasks appended here as complete, one line each: `Task N: complete (commits <base7>..<head7>, review clean)`)
Task 1: complete (commits 4136d36..da89b15, review clean — 2 documented deviations accepted: eslint script, in-place merge scaffold)
Task 2: complete (commits da89b15..24a50bc, review clean)
Task 3: complete (Supabase project cnipecxbtnwlrwfbpyaw created, migration 0001_init applied, .env.local filled, RLS advisors clean; commit 457f0e1 — done directly by controller, not subagent, since it required cloud project creation)
Task 3: region corrected to ap-southeast-1 (new project apgdyaiztmsnohakjkfg replaces cnipecxbtnwlrwfbpyaw, deleted by user); migration re-applied, RLS advisors clean, .env.local updated
Task 4: complete (commits 457f0e1..f5abf0b, review clean — minor: implementer report miscounted KNOWN_TAGS as 30 vs actual 32, code correct)
Task 5: complete (commits f5abf0b..033ffd0, review clean)
Task 6: complete (commits 033ffd0..b11fd7e, review clean, independently curl-verified redirect behavior)
Task 7: complete (commits b11fd7e..47bb61b, 1 fix round — Google OAuth error handling added, review clean)
Task 8: complete (commits 47bb61b..3233d11, review clean)
Task 9: complete (commits 3233d11..29198ab, review clean; authenticated visual check deferred — signup blocked in implementer env, redirect path verified via Playwright, code verbatim to brief)
Task 10: complete (commits 29198ab..0c792eb, review clean; extractCompany regex bug fixed per brief's own Step 5 allowance, verified independently by reviewer, 10/10 tests pass)
Task 11: complete (commits 0c792eb..75e65f7, 2 fix rounds — removed unauthorized any/Variants annotation, then fixed real downstream type error with as const; project-wide tsc clean)
Task 12: complete (commits 75e65f7..21e1e5e, review clean; minor a11y/mobile-grid notes inherited from brief, flagged for later polish)
Task 13: complete (commits 21e1e5e..d1348c9, 1 fix round — allowlisted POST insert fields to prevent client-controlled id/timestamps; minor: tags element validation + url/salary_range/location length caps still missing, noted for later)
Task 14: complete (commits d1348c9..8603750, review clean; built with allowlist pattern from Task 13's fix applied upfront)
Task 15: complete (commits 8603750..f7cdb05, review clean; useCallback + functional-updater rollback deviation from brief verified as a real stale-closure bug fix, not scope creep)
Task 16: complete (commits f7cdb05..34adfc4, review clean)
Task 17: complete (commits 34adfc4..9f6dbf7, 1 fix round — critical dnd-kit multi-container drop resolution bug fixed; 2 minor a11y/click-suppression items inherited from brief, noted for later)
Task 18: complete (commits 9f6dbf7..b784ff4, review clean; build + typecheck both independently verified)
Task 19: complete (commits b784ff4..29d64e4, review clean; all 32 KNOWN_TAGS covered, cross-checked programmatically)
Task 20: complete (commits 29d64e4..799cea2, review clean)
Task 21: complete (commits 799cea2..68ea34e, review clean; minor delete-failure silent-UX gap inherited from brief, noted for later)
Task 22: complete (commits 68ea34e..dfb1846, review clean, 5/5 tests, boundary logic independently traced/verified)
Task 23: complete (commits dfb1846..f3c2ff7, review clean; layout.tsx auth guard from Task 9 verified untouched)
Task 24: complete (commits f3c2ff7..508c77f, review clean; shadcn toast deprecated in registry, substituted sonner (justified), formatDate restored after shadcn init clobbered it, design tokens verified intact, radius-token name collision fixed proactively)
Task 25: complete (commits 508c77f..a72a646, review clean; found+fixed real bug — Framer Motion staggered reveals didn't respect prefers-reduced-motion, CSS media query only stopped aurora; fixed with MotionConfig)
Task 26: GitHub push done (github.com/Hafiz-Mhf/jobtrackr, private, main branch, 33 commits) — Vercel deploy paused per user instruction, awaiting go-ahead
Task 26: complete — Vercel deployed (hafiz-mhfs-projects/jobtrackr), custom domain jobtrackr.hafizfaruqi.my live via CNAME, git author fixed (was blocking deploy), root / redirects to /login, scaffold metadata replaced. MVP code-complete.

--- Profile/Privacy Plan (docs/superpowers/plans/2026-07-03-jobtrackr-profile-privacy.md) ---
Task 1: complete (migration 77d88cb applied live to apgdyaiztmsnohakjkfg; profiles table + avatars bucket confirmed via list_tables; service-role key added to .env.local + Vercel by user)
Task 2: complete (commits 77d88cb..75b91d7, review clean)
Task 3: complete (commits 75b91d7..4278ded, review clean, 15/15 tests)
Task 4: complete (commits 4278ded..6f23131, review clean)
Task 5: complete (commits 6f23131..2fdcf22, 1 fix round — logged unhandled avatar storage-cleanup errors; also: controller backfilled missing profiles rows for pre-trigger users, migration 0003)
Task 6: complete (commits 2fdcf22..deef6f2, review clean, verified live via Playwright end-to-end)
Task 7: complete (commits deef6f2..9a6a75a, review clean)
Task 8: complete (commits 9a6a75a..fef6ece, review clean; minor rel=noopener nit on /privacy links noted, not blocking)
Task 9: complete (commits fef6ece..deff3cd, 1 fix round — empty img-src bug inherited from brief's own sample code fixed, plus label/input a11y association)
Task 10: complete (commits deff3cd..8dece31, review clean; Base UI alert-dialog API independently verified against real .d.ts, no bugs found this time)
Task 11: complete (commits 8dece31..f777b4a, review clean, verified live incl. persistence-after-reload)
Task 12: complete (commits f777b4a..77b4f23, review clean; 2 real bugs found+fixed during live verification — dropdown z-index collision with global main{z-index:1} rule, Menu.Item swapped for Menu.LinkItem for correct <a> navigation semantics — both independently verified by reviewer against globals.css and Base UI .d.ts)
Final whole-branch review: complete (range 00417ee..77b4f23, then fix eafb1d2). Ready to merge: With fixes -> fixed.
  - Important (fixed): PATCH /api/profile accepted arbitrary avatar_url strings with no server-side sanity check; now validated against the user's own Supabase Storage avatars path prefix (commit eafb1d2, re-reviewed clean).
  - Minor (not fixed, logged for later): .single() in export/PATCH routes 500s if a profile row is ever missing (page already has fallback; routes don't) — consider .maybeSingle(). Migration 0002 not idempotent for manual re-runs (fine under tracked migration runner). Redundant profile fetch (layout.tsx + profile/page.tsx each query it once per /profile visit) — negligible at this scale. Client-only consent gate for email signup is an accepted spec tradeoff, not a defect.
ALL 12 TASKS + FINAL REVIEW COMPLETE. Profile/Logout/Privacy feature done.
Task 5: complete (commits 606c2aa..958acf4, review clean, build clean, /api/tags route confirmed)
Task 6: complete (commits 958acf4..abe29f1, review clean, build clean; learnTags wired after success check in POST + PATCH)
Task 7: complete (commits abe29f1..33ae00e, 1 fix round — addLocal intra-batch dedup bug inherited from brief sample fixed with incremental seen set, plus exported TagsContext for convention; re-review clean, tsc+eslint clean)
Task 8: complete (commits 33ae00e..603d1ab, review clean, 57/57 tests, build clean; controller live-verified end-to-end: learned Snowflake round-tripped — persisted on save via learnTags, dictionary tags correctly NOT learned, auto-extracted after reload; single GET /api/tags on load; test data cleaned up)
Final whole-branch review: complete (range d053ad0..603d1ab, opus). Verdict: merge with fixes -> fixed (commit 6f53b1f, re-review clean, 59 tests).
  - Important (FIXED): dictionary common-word false positives — bare 'Go','next','Word','Excel','Spring','SAP','REST' tagged ordinary prose. Fixed: dropped 'next' alias; case-sensitive match for ambiguous terms Go/REST/SAP/Word/Excel/Spring (compound aliases like 'spring boot','rest api' stay case-insensitive). Live-relevant regression on the headline feature.
  - Minor (FIXED): jobs POST+PATCH now validate/cap the tags array (filter non-strings, trim, drop empties, cap 50 tags, cap each to MAX_FIELD_LENGTH; added MAX_TAGS=50).
  - Minor (accepted): learnTags adds a SELECT+INSERT to the awaited save path (after job persisted, best-effort) — negligible latency at this scale.
  - Minor (accepted, Task 1): .NET/C++/C# bare-symbol canonicals match only via aliases.
  - Minor (accepted, Task 4): concurrent learnTags batch insert can fail wholesale on unique-conflict race — best-effort, never throws.
ALL 8 TASKS + FINAL REVIEW COMPLETE. Scalable tags feature done (dictionary + per-user learned tags).
