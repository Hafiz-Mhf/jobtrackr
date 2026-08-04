# URL Job Extraction — Design

**Date:** 2026-08-03
**Status:** Approved, ready for implementation planning

## Problem

Adding a job requires pasting the full job description text. Users find jobs as links — from LinkedIn, a Greenhouse board, a company careers page — and must open the link, select the description, copy it, and paste it back. The `ParseInput` placeholder already promises "Paste the job description text **or link** here", but pasting a link today produces garbage: `lib/parser.ts` runs its heuristics over a URL string.

Most job postings on ATS platforms (Greenhouse, Lever, Workable, Ashby) and many corporate career pages embed `schema.org/JobPosting` as JSON-LD for Google Jobs indexing. That JSON carries title, company, location, salary, and description as clean structured fields. Reading it is strictly better than any text heuristic.

## Goal

Paste a job URL into the existing box, click Extract, and get the review form prefilled — with no new AI dependency and no per-site scraper maintenance.

## Non-goals

- Per-site CSS-selector adapters for specific portals.
- Bulk or multi-URL import.
- Background re-fetch of already-saved jobs.
- Headless-browser rendering for JavaScript-only pages.
- Defeating anti-bot protection on sites that decline to be read.

## Architecture

The server does only the two things a browser cannot: cross-origin fetch, and reducing HTML to something usable. Parsing stays client-side, matching the existing architecture where `lib/parser.ts` runs in the browser and reads `customTags` from `TagsProvider`.

### New files

| File | Responsibility |
|---|---|
| `lib/url.ts` | `isSingleUrl(text): string \| null` — client-side auto-detect. |
| `lib/extract/url-guard.ts` | `assertSafeUrl(raw): URL` — validation rules below. Throws typed error. |
| `lib/extract/fetch-page.ts` | `fetchJobPage(url): Promise<string>` — guarded fetch with manual redirects. |
| `lib/extract/html-to-text.ts` | `htmlToText(html): string` — pure. |
| `lib/extract/jsonld.ts` | `extractJobPosting(html): ParsedJob \| null` — pure. |
| `lib/extract/errors.ts` | `ExtractError`, error codes, and the user-facing message map. |
| `lib/extract/rate-limit.ts` | `checkRateLimit(userId, now?)` — in-memory per-user window. |
| `app/api/jobs/fetch-url/route.ts` | `POST` handler; auth, rate limit, orchestration. |

### Changed files

| File | Change |
|---|---|
| `hooks/useParser.ts` | Add `parseFromUrl(url, customTags)`. All async and error handling lives here. |
| `components/jobs/ParseInput.tsx` | On Extract, branch on `isSingleUrl(text)`. Add loading state to the button. |

Each unit above is independently testable: the pure functions take a string and return a value, the guard takes a string and throws or returns, the route composes them.

### Data flow

`isSingleUrl` returns a URL only when the entire trimmed input is one token that parses as a URL. Any surrounding prose — a pasted description that happens to contain a link — takes the existing text path unchanged.

```text
paste → Extract click
  ├─ not a URL ─────────────────→ parseJobDescription(text, customTags)   [unchanged]
  └─ single URL
       └─ POST /api/jobs/fetch-url  { url }
            server: assertSafeUrl → fetchJobPage → extractJobPosting(html)
              ├─ hit  → { jobPosting: ParsedJob, text: null }
              └─ miss → { jobPosting: null, text: htmlToText(html) }
                                          ↓
            client: jobPosting ?? parseJobDescription(text, customTags)
              → JobForm prefilled, url field = the pasted URL
```

On any failure the client still opens `JobForm` with `url` prefilled. The pasted link is never lost.

### Response contract

```ts
// success
{ data: { jobPosting: ParsedJob | null, text: string | null } }
// failure
{ error: string }   // human-readable, see Errors
```

Exactly one of `jobPosting` / `text` is non-null.

### JSON-LD → ParsedJob mapping

| Schema path | `ParsedJob` field |
|---|---|
| `title` | `role` |
| `hiringOrganization.name` | `company` |
| `jobLocation.address.addressLocality` (+ `, addressRegion`) | `location` |
| `baseSalary.value` (`minValue`/`maxValue`/`value`, `currency`, `unitText`) | `salary_range` |
| `description` (HTML) → `htmlToText` | `description` |
| derived: `matchDictionary(description)` | `tags` |

The server has no access to per-user learned tags, which live in `TagsProvider` on the client. It therefore contributes dictionary matches only, and the client merges `matchCustomTags(description, customTags)` into the tag list on receipt. Custom-tag learning keeps working on the JSON-LD path.

Absent optional fields (`location`, `salary_range`) stay `undefined`. Nothing is invented. `jobLocation` may be an array — take the first entry. The document root may be a bare object, an array, or `{ "@graph": [...] }`; all three are walked for the first node whose `@type` is or includes `JobPosting`.

`ParsedJob.company` and `ParsedJob.role` are non-optional strings. Resolution rule:

- Neither `title` nor `hiringOrganization.name` present → treat the whole block as a miss and fall through to the text path. A JSON-LD block yielding nothing useful is worse than the heuristics.
- Exactly one present → use it, and fill the other with the existing sentinel (`'Unknown Company'` / `'Unknown Role'`) that `lib/parser.ts` already produces and `ParseInput` already counts as "not found".

## Security

This endpoint makes the server fetch a user-supplied URL, which is a Server-Side Request Forgery primitive if left open.

### URL validation, before any network call

- Parse with `new URL()`; reject on throw. Reject if longer than 2048 characters.
- Protocol allowlist: `https:` only. HTTP is rejected — every real job board is HTTPS, and permitting it widens the reachable surface to plaintext internal services.
- Reject embedded credentials (`https://user:pass@host`).
- Reject `localhost`, any host ending in `.localhost`, `.local`, or `.internal`, and any bare hostname containing no dot.
- Reject IP-literal hosts, IPv4 and IPv6. No legitimate job posting is served from an IP literal, so this eliminates the entire private-range class without range arithmetic on the URL string.

### Resolved-address check and redirects

String validation is not sufficient: a public hostname can resolve to a private address, and a public page can redirect to one.

1. Resolve the hostname with `dns.promises.lookup` before fetching. Reject if the address falls in a private or reserved range: `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `0.0.0.0/8`, `::1`, `fc00::/7`, `fe80::/10`.
2. Fetch with `redirect: 'manual'`. On a 3xx, re-run full validation against the `Location` header and follow manually, maximum 3 hops. This is what prevents a benign-looking host from bouncing the request to `http://169.254.169.254/`.

**Known gap, accepted for MVP:** a TOCTOU window remains between our DNS lookup and the socket's own resolution. Closing it requires a custom HTTP agent pinned to the validated IP address. Documented rather than claimed as solved.

The route runs on the Node.js runtime (the Vercel default), which `dns.promises` requires.

### Fetch guards

- 8-second timeout via `AbortSignal.timeout(8000)`.
- 2 MB response cap, enforced by streaming the body and aborting once the byte count is exceeded — not by trusting `Content-Length`.
- `Content-Type` must be `text/html` or `application/xhtml+xml`. Anything else is rejected before parsing.
- Honest `User-Agent` identifying JobTrackr. No cookies or credentials forwarded.

### Access control

- Requires an authenticated Supabase user via the same `supabase.auth.getUser()` gate as `/api/jobs`. Unauthenticated requests get 401. This is what keeps the endpoint from being an open proxy.
- Per-user rate limit of 10 fetches per minute, held in memory. Being straight about the limitation: in-memory state is per-instance and resets on cold start, so on serverless this is a speed bump against casual abuse, not a real quota. It avoids adding Redis for MVP. If abuse appears, that is the upgrade path.

### Treating fetched content as hostile

- Every returned string is untrusted third-party content, rendered through plain JSX interpolation only — never `dangerouslySetInnerHTML`. This is genuinely attacker-controlled input, not merely user-pasted text.
- JSON-LD is attacker-controlled JSON. The mapper never spreads the parsed object; it reads named fields one at a time, which sidesteps prototype pollution through `__proto__` or `constructor` keys.
- Each `<script type="application/ld+json">` block is `JSON.parse`d inside its own try/catch. One malformed block must not prevent the others from being read.
- Returned text is truncated server-side to the existing `MAX_TEXT_LENGTH` (10000), so extraction output cannot exceed what `/api/jobs` accepts on save.

## Errors

One message per failure class, all human-readable and pointing at the workaround:

| Cause | Message |
|---|---|
| Invalid or blocked URL | "That doesn't look like a job posting link." |
| Timeout | "That site took too long. Paste the description text instead." |
| 401 / 403 / 429 from target | "That site blocks automatic reading. Paste the description text instead." |
| Non-HTML content type | "That link isn't a web page we can read." |
| Network failure | "Couldn't reach that link. Check it and try again." |
| Response exceeds the 2 MB cap | "That page is too large to read. Paste the description text instead." |
| Fetched page holds almost no text | "That page didn't include readable job details — it may load them with JavaScript. Paste the description text instead." |
| Rate limited | "Too many links fetched. Wait a minute and try again." |

LinkedIn, Indeed, and JobStreet will usually land in row 3. That is the expected common case, not an edge case, so the copy must stay calm and name the alternative.

Server logging uses the `[jobs/fetch-url]` prefix and records the error only — never the fetched body, never the URL's query string.

## Testing

Pure functions get unit tests under `__tests__/lib/`, using the existing vitest setup. No new config.

- `extract/jsonld.test.ts` — Greenhouse, Lever, and Ashby fixture shapes; bare `JobPosting`; `@graph` wrapper; top-level array; missing `hiringOrganization`; salary as min/max versus single value; no JSON-LD returns `null`; malformed block is skipped rather than thrown; `__proto__` in the payload does not pollute.
- `extract/html-to-text.test.ts` — `script` and `style` content dropped; `<br>`, `<p>`, `<li>` become newlines; entities decoded; whitespace collapsed.
- `extract/rate-limit.test.ts` — allows up to the limit; rejects past it; allows again after the window; tracks users separately. `now` is injected, so no fake timers.
- `extract/url-guard.test.ts` — one case per validation rule: https accepted; http rejected; `localhost` rejected; `127.0.0.1`, `10.0.0.1`, `192.168.1.1`, `169.254.169.254` rejected; `user:pass@host` rejected; IPv6 literal rejected; over-length rejected.

The route handler and the `ParseInput` wiring are verified manually against one real Greenhouse, Lever, and Ashby posting, plus a LinkedIn URL to confirm the blocked-site copy reads well. No HTTP mocking layer is added for MVP.

## Verified behaviour against live boards

Measured 2026-08-03 against real postings. The original premise — that Greenhouse, Lever, Workable, and Ashby all embed JSON-LD — turned out to be only partly true. Recorded here so nobody re-derives it:

| Board | Outcome | Notes |
|---|---|---|
| Lever (`jobs.lever.co`) | JSON-LD hit | Company, role, location, and full description all mapped cleanly. |
| Greenhouse (`job-boards.greenhouse.io`) | Text fallback | Serves **no** `ld+json` on the job page. The stripped text is rich (~17.5k chars), so the heuristic parser still has plenty to work with. |
| Ashby (`jobs.ashbyhq.com`) | `no_content` | Fully client-rendered. The served HTML is a ~7 kB shell reducing to 4 characters of text. |
| Indeed (`indeed.com`) | `blocked` | Returns 403 to a non-browser user agent, as expected. |

This is why the text fallback carries the design rather than being a safety net: for Greenhouse — a major board — it is the only path. It also motivated the `no_content` case: without a minimum-content floor, an Ashby link would have prefilled the form with the word "Jobs" as the job description.

### Malaysian portals (2026-08-04)

Checked on request against the portals listed in `APPLICATION_SOURCES`. No code changed — the design was already generic (any `https:` URL, no per-site allowlist), so "support" here means only: does that portal's real page carry `JobPosting` JSON-LD or usable text.

| Portal | Outcome | Notes |
|---|---|---|
| JobStreet (`my.jobstreet.com`) | Text fallback | No `ld+json` job schema, but the job page is server-rendered with role, company, location, and salary all present in plain text (~5.2k chars). |
| Maukerja (`maukerja.my`) | JSON-LD hit | Full `JobPosting` schema: title, hiringOrganization, jobLocation with locality+region, baseSalary with min/max/unit. Maps cleanly through the existing mapper. |
| Ricebowl (`ricebowl.my`) | JSON-LD hit | Same ATS backend as Maukerja (both AJobThing brands) — byte-identical `JobPosting` shape on the job-detail page. Its `/jobsearch` listing page is a client-rendered Nuxt shell, but that's not the page a user pastes. |
| Indeed (`indeed.com`) | `blocked` | 403 to a non-browser user agent, same as the earlier finding. |
| MyFutureJobs (`myfuturejobs.gov.my`) | Not extractable — no code fixes this | The public site is a WordPress marketing page; actual job postings live behind Keycloak login on `candidates.myfuturejobs.gov.my`. There is no public job-detail URL to paste in the first place. A pasted link here correctly lands on manual entry with only the URL preserved — the right outcome for an auth-walled site, not a gap. |

## Rejected alternatives

**Fat server route** — server fetches, extracts, and runs `lib/parser.ts` itself, returning a finished `ParsedJob`. One fewer branch on the client, but it moves parsing server-side against the stated architecture and forces `customTags` (client state from `TagsProvider`) up in the request body.

**Fetch-and-save** — server extracts and inserts the job directly. Removes the "Review Extracted Details" step, which is the only safety net over fuzzy extraction.

**Per-site adapters** — hand-written CSS selectors for JobStreet, Hiredly, and similar. Best accuracy on Malaysian portals, but the markup changes and the adapters rot. JSON-LD plus text fallback degrades gracefully instead of breaking.

**cheerio** — a real HTML parser, robust against malformed markup and `</script>` inside a JSON string. Rejected because the fallback path is heuristic regardless, and a new server-side dependency is not worth it for this. Revisit if regex extraction proves unreliable in practice.
