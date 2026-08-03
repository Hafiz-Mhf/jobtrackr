# URL Job Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user paste a job posting URL into the existing Add Job box and get the review form prefilled, by reading `schema.org/JobPosting` JSON-LD server-side with a stripped-plaintext fallback through the existing client-side parser.

**Architecture:** A thin authenticated `POST /api/jobs/fetch-url` route does only what a browser cannot — cross-origin fetch and HTML reduction — returning either a mapped `ParsedJob` (JSON-LD hit) or plaintext (miss). The client decides: use the `ParsedJob` as-is, or run the existing `parseJobDescription` over the plaintext. Parsing stays in the browser, matching how `lib/parser.ts` already works with per-user custom tags from `TagsProvider`.

**Tech Stack:** Next.js 16 App Router (Node.js runtime), TypeScript strict, Supabase SSR auth, vitest. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-08-03-url-job-extraction-design.md`

## Global Constraints

- **No new npm packages.** HTML handling is regex-based by design. If you reach for `cheerio`, stop — the spec rejected it explicitly.
- **No `any`.** TypeScript strict. Use `unknown` plus narrowing helpers for parsed JSON.
- **Never spread attacker-controlled parsed JSON.** Read named fields one at a time. This is the prototype-pollution defense.
- **Never `dangerouslySetInnerHTML`** on anything returned from these modules — all of it is third-party content.
- Named exports for components and modules; default export only for pages.
- Server logs use the `[jobs/fetch-url]` prefix and record the error code only — never the fetched body, never the URL query string.
- Existing user-facing copy strings live in `lib/extract/errors.ts` (Task 2) and are the only source for error messages. Do not inline message strings elsewhere.
- Tests are vitest, `environment: 'node'`, run with `npm test`. The `@` alias maps to the repo root (see `vitest.config.ts`).
- Commit after every task.

---

### Task 1: Single-URL detection

**Files:**
- Create: `lib/url.ts`
- Test: `__tests__/lib/url.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `isSingleUrl(text: string): string | null` — returns the trimmed URL when the *entire* input is one URL token, else `null`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/url.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isSingleUrl } from '@/lib/url'

describe('isSingleUrl', () => {
  it('returns the URL when the whole input is one link', () => {
    expect(isSingleUrl('https://jobs.lever.co/acme/4f2a')).toBe('https://jobs.lever.co/acme/4f2a')
  })

  it('trims surrounding whitespace', () => {
    expect(isSingleUrl('  https://example.com/job  ')).toBe('https://example.com/job')
  })

  it('returns null when a link is embedded in prose', () => {
    expect(isSingleUrl('Apply here: https://example.com/job')).toBeNull()
  })

  it('returns null for a multi-line job description', () => {
    expect(isSingleUrl('Senior Frontend Engineer at Stripe\nWe are looking for...')).toBeNull()
  })

  it('returns null for plain text', () => {
    expect(isSingleUrl('Senior Frontend Engineer')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(isSingleUrl('   ')).toBeNull()
  })

  it('returns null for a non-http scheme', () => {
    expect(isSingleUrl('ftp://example.com/job')).toBeNull()
  })

  // http passes detection so the server can reject it with a clear message,
  // rather than the text parser silently producing garbage from a URL string.
  it('returns an http URL so the server can reject it explicitly', () => {
    expect(isSingleUrl('http://example.com/job')).toBe('http://example.com/job')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/url.test.ts`
Expected: FAIL — cannot resolve `@/lib/url`.

- [ ] **Step 3: Write the implementation**

Create `lib/url.ts`:

```ts
// Detects when the entire input is a single URL, so ParseInput can route it to
// the fetch endpoint. Prose that merely contains a link takes the text path.
export function isSingleUrl(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed || /\s/.test(trimmed)) return null
  if (!/^https?:\/\//i.test(trimmed)) return null
  try {
    new URL(trimmed)
    return trimmed
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/url.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/url.ts __tests__/lib/url.test.ts
git commit -m "feat: detect when pasted input is a single job URL"
```

---

### Task 2: Error taxonomy and URL safety guard

This is the SSRF boundary. Every rule here exists because the server is about to fetch a URL a user controls.

**Files:**
- Create: `lib/extract/errors.ts`
- Create: `lib/extract/url-guard.ts`
- Test: `__tests__/lib/extract/url-guard.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ExtractErrorCode = 'invalid_url' | 'timeout' | 'blocked' | 'not_html' | 'too_large' | 'network' | 'rate_limited'`
  - `class ExtractError extends Error` with a readonly `code: ExtractErrorCode`
  - `const EXTRACT_ERROR_MESSAGES: Record<ExtractErrorCode, string>`
  - `assertSafeUrl(raw: string): URL` — throws `ExtractError('invalid_url')`
  - `isPrivateAddress(address: string, family: number): boolean`
  - `assertPublicHost(hostname: string): Promise<void>` — throws `ExtractError`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/extract/url-guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assertSafeUrl, isPrivateAddress } from '@/lib/extract/url-guard'
import { ExtractError } from '@/lib/extract/errors'

function rejects(url: string) {
  expect(() => assertSafeUrl(url)).toThrowError(ExtractError)
}

describe('assertSafeUrl', () => {
  it('accepts a normal https job URL', () => {
    expect(assertSafeUrl('https://boards.greenhouse.io/acme/jobs/123').hostname)
      .toBe('boards.greenhouse.io')
  })

  it('rejects http', () => rejects('http://example.com/job'))
  it('rejects a non-http scheme', () => rejects('file:///etc/passwd'))
  it('rejects unparseable input', () => rejects('not a url'))
  it('rejects embedded credentials', () => rejects('https://user:pass@example.com/job'))
  it('rejects localhost', () => rejects('https://localhost/job'))
  it('rejects a .localhost suffix', () => rejects('https://app.localhost/job'))
  it('rejects a .internal suffix', () => rejects('https://metadata.internal/job'))
  it('rejects a .local suffix', () => rejects('https://printer.local/job'))
  it('rejects a bare hostname with no dot', () => rejects('https://intranet/job'))
  it('rejects an IPv4 literal', () => rejects('https://169.254.169.254/latest/meta-data'))
  it('rejects a loopback IPv4 literal', () => rejects('https://127.0.0.1/job'))
  it('rejects an IPv6 literal', () => rejects('https://[::1]/job'))

  it('rejects a URL over 2048 characters', () => {
    rejects(`https://example.com/${'a'.repeat(2100)}`)
  })
})

describe('isPrivateAddress', () => {
  it.each([
    ['10.0.0.1', 4],
    ['172.16.0.1', 4],
    ['172.31.255.255', 4],
    ['192.168.1.1', 4],
    ['127.0.0.1', 4],
    ['169.254.169.254', 4],
    ['0.0.0.0', 4],
    ['::1', 6],
    ['fc00::1', 6],
    ['fd12:3456::1', 6],
    ['fe80::1', 6],
    ['::ffff:10.0.0.1', 6],
  ])('flags %s as private', (address, family) => {
    expect(isPrivateAddress(address, family)).toBe(true)
  })

  it.each([
    ['8.8.8.8', 4],
    ['172.15.0.1', 4],
    ['172.32.0.1', 4],
    ['93.184.216.34', 4],
    ['2606:2800:220:1:248:1893:25c8:1946', 6],
  ])('allows public address %s', (address, family) => {
    expect(isPrivateAddress(address, family)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/extract/url-guard.test.ts`
Expected: FAIL — cannot resolve `@/lib/extract/url-guard`.

- [ ] **Step 3: Write the error module**

Create `lib/extract/errors.ts`:

```ts
export type ExtractErrorCode =
  | 'invalid_url'
  | 'timeout'
  | 'blocked'
  | 'not_html'
  | 'too_large'
  | 'network'
  | 'rate_limited'

// The only source of user-facing extraction copy. Every message names the
// workaround, because a blocked site is the expected case, not an edge case.
export const EXTRACT_ERROR_MESSAGES: Record<ExtractErrorCode, string> = {
  invalid_url: "That doesn't look like a job posting link.",
  timeout: 'That site took too long. Paste the description text instead.',
  blocked: 'That site blocks automatic reading. Paste the description text instead.',
  not_html: "That link isn't a web page we can read.",
  too_large: 'That page is too large to read. Paste the description text instead.',
  network: "Couldn't reach that link. Check it and try again.",
  rate_limited: 'Too many links fetched. Wait a minute and try again.',
}

export class ExtractError extends Error {
  readonly code: ExtractErrorCode

  constructor(code: ExtractErrorCode) {
    super(code)
    this.name = 'ExtractError'
    this.code = code
  }
}
```

- [ ] **Step 4: Write the guard**

Create `lib/extract/url-guard.ts`:

```ts
import { promises as dns } from 'dns'
import { ExtractError } from './errors'

const MAX_URL_LENGTH = 2048
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal']
const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/

// String-level validation, run before any network call and again on every
// redirect hop. IP literals are rejected outright: no real job posting is
// served from one, so this removes the whole private-range class up front.
export function assertSafeUrl(raw: string): URL {
  if (raw.length > MAX_URL_LENGTH) throw new ExtractError('invalid_url')

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ExtractError('invalid_url')
  }

  if (url.protocol !== 'https:') throw new ExtractError('invalid_url')
  if (url.username || url.password) throw new ExtractError('invalid_url')

  const host = url.hostname.toLowerCase()
  if (host.startsWith('[')) throw new ExtractError('invalid_url')   // URL brackets IPv6 literals
  if (IPV4_LITERAL.test(host)) throw new ExtractError('invalid_url')
  if (host === 'localhost') throw new ExtractError('invalid_url')
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) throw new ExtractError('invalid_url')
  if (!host.includes('.')) throw new ExtractError('invalid_url')

  return url
}

export function isPrivateAddress(address: string, family: number): boolean {
  if (family === 4) {
    const parts = address.split('.').map(Number)
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return true
    const [a, b] = parts
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
  }

  const addr = address.toLowerCase().split('%')[0]
  if (addr === '::1' || addr === '::') return true

  const mapped = addr.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (mapped) return isPrivateAddress(mapped[1], 4)

  const head = Number.parseInt(addr.split(':')[0] || '0', 16)
  if (Number.isNaN(head)) return true
  if ((head & 0xfe00) === 0xfc00) return true   // fc00::/7  unique local
  if ((head & 0xffc0) === 0xfe80) return true   // fe80::/10 link local
  return false
}

// A public hostname can still resolve to a private address, so check what DNS
// actually returns before connecting.
//
// KNOWN GAP, accepted for MVP: a TOCTOU window remains between this lookup and
// the socket's own resolution. Closing it requires a custom HTTP agent pinned
// to the validated address.
export async function assertPublicHost(hostname: string): Promise<void> {
  let results: { address: string; family: number }[]
  try {
    results = await dns.lookup(hostname, { all: true })
  } catch {
    throw new ExtractError('network')
  }
  if (results.length === 0) throw new ExtractError('network')
  for (const { address, family } of results) {
    if (isPrivateAddress(address, family)) throw new ExtractError('invalid_url')
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/extract/url-guard.test.ts`
Expected: PASS, 31 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/extract/errors.ts lib/extract/url-guard.ts __tests__/lib/extract/url-guard.test.ts
git commit -m "feat: add extraction error taxonomy and SSRF URL guard"
```

---

### Task 3: HTML to plaintext

**Files:**
- Create: `lib/extract/html-to-text.ts`
- Test: `__tests__/lib/extract/html-to-text.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `htmlToText(html: string): string`, `decodeEntities(s: string): string`

Order matters: tags are stripped *before* entities are decoded, so an encoded `&lt;script&gt;` in the source becomes inert literal text rather than a real tag.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/extract/html-to-text.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { htmlToText, decodeEntities } from '@/lib/extract/html-to-text'

describe('htmlToText', () => {
  it('drops script content', () => {
    expect(htmlToText('<p>Real</p><script>var secret = 1</script>')).toBe('Real')
  })

  it('drops style content', () => {
    expect(htmlToText('<style>.a{color:red}</style><p>Real</p>')).toBe('Real')
  })

  it('drops nav and footer content', () => {
    expect(htmlToText('<nav>Home About</nav><p>Real</p><footer>Legal</footer>')).toBe('Real')
  })

  it('drops HTML comments', () => {
    expect(htmlToText('<p>Real</p><!-- hidden note -->')).toBe('Real')
  })

  it('turns <br> into a newline', () => {
    expect(htmlToText('one<br>two')).toBe('one\ntwo')
  })

  it('puts adjacent paragraphs on separate lines', () => {
    expect(htmlToText('<p>one</p><p>two</p>')).toBe('one\ntwo')
  })

  it('puts list items on separate lines', () => {
    expect(htmlToText('<ul><li>React</li><li>Node.js</li></ul>')).toBe('React\nNode.js')
  })

  it('drops blank lines left behind by empty block tags', () => {
    expect(htmlToText('<p>one</p><div></div><div></div><p>two</p>')).toBe('one\ntwo')
  })

  it('strips inline tags without gluing words together', () => {
    expect(htmlToText('<p>We use <b>React</b> daily</p>')).toBe('We use React daily')
  })

  it('decodes entities in the output', () => {
    expect(htmlToText('<p>R&amp;D &mdash; it&#39;s great</p>')).toBe("R&D — it's great")
  })

  it('does not resurrect an encoded script tag as markup', () => {
    expect(htmlToText('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')).toBe('<script>alert(1)</script>')
  })

  it('returns an empty string for empty input', () => {
    expect(htmlToText('')).toBe('')
  })
})

describe('decodeEntities', () => {
  it('decodes named entities', () => {
    expect(decodeEntities('a &amp; b &lt; c &nbsp;d')).toBe('a & b < c  d')
  })

  it('decodes decimal and hex numeric entities', () => {
    expect(decodeEntities('&#39;&#x27;')).toBe("''")
  })

  it('leaves an unknown entity untouched', () => {
    expect(decodeEntities('&notarealentity;')).toBe('&notarealentity;')
  })

  it('drops an out-of-range code point instead of throwing', () => {
    expect(decodeEntities('a&#1114112;b')).toBe('ab')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/extract/html-to-text.test.ts`
Expected: FAIL — cannot resolve `@/lib/extract/html-to-text`.

- [ ] **Step 3: Write the implementation**

Create `lib/extract/html-to-text.ts`:

```ts
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  bull: '•', middot: '·',
}

function safeCodePoint(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return ''
  try {
    return String.fromCodePoint(n)
  } catch {
    return ''
  }
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
}

// Elements whose text is never part of a job description.
const DROPPED_ELEMENTS =
  /<(script|style|noscript|svg|nav|header|footer|iframe|template|form)\b[^>]*>[\s\S]*?<\/\1>/gi

// Tags that imply a line break in the rendered page.
const BLOCK_TAGS =
  /<\/?(p|div|br|li|ul|ol|tr|td|h[1-6]|section|article|table|blockquote|pre)\b[^>]*>/gi

export function htmlToText(html: string): string {
  // Tags are stripped before entities are decoded, so encoded markup in the
  // source stays inert text instead of becoming a real tag.
  const stripped = html
    .replace(DROPPED_ELEMENTS, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(BLOCK_TAGS, '\n')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(stripped)
    .replace(/\r/g, '')
    .replace(/[ \t\f\v ]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/extract/html-to-text.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/extract/html-to-text.ts __tests__/lib/extract/html-to-text.test.ts
git commit -m "feat: add dependency-free HTML to plaintext reducer"
```

---

### Task 4: JSON-LD JobPosting extraction

**Files:**
- Create: `lib/extract/jsonld.ts`
- Test: `__tests__/lib/extract/jsonld.test.ts`

**Interfaces:**
- Consumes: `htmlToText` (Task 3); `matchDictionary`, `normalizeTag` from `@/lib/skills`; `ParsedJob` from `@/types`.
- Produces: `extractJobPosting(html: string): ParsedJob | null`

Resolution rule from the spec: if neither `title` nor `hiringOrganization.name` is present, the block is a miss and the caller falls through to the text path. If exactly one is present, fill the other with the same sentinel `lib/parser.ts` already produces (`'Unknown Company'` / `'Unknown Role'`).

`ParsedJob.tags` here comes from `matchDictionary` only — the server has no access to per-user custom tags. Task 8 merges those in client-side.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/extract/jsonld.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { extractJobPosting } from '@/lib/extract/jsonld'

function page(json: string): string {
  return `<html><head><script type="application/ld+json">${json}</script></head><body>x</body></html>`
}

const FULL = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: 'Senior Frontend Engineer',
  hiringOrganization: { '@type': 'Organization', name: 'Acme Corp' },
  jobLocation: {
    '@type': 'Place',
    address: { '@type': 'PostalAddress', addressLocality: 'Kuala Lumpur', addressRegion: 'WP' },
  },
  baseSalary: {
    '@type': 'MonetaryAmount',
    currency: 'MYR',
    value: { '@type': 'QuantitativeValue', minValue: 8000, maxValue: 12000, unitText: 'MONTH' },
  },
  description: '<p>We use <b>React</b> and TypeScript daily.</p>',
})

describe('extractJobPosting', () => {
  it('maps a complete JobPosting', () => {
    const result = extractJobPosting(page(FULL))
    expect(result).not.toBeNull()
    expect(result?.role).toBe('Senior Frontend Engineer')
    expect(result?.company).toBe('Acme Corp')
    expect(result?.location).toBe('Kuala Lumpur, WP')
    expect(result?.salary_range).toBe('MYR 8,000 - 12,000/mo')
    expect(result?.description).toBe('We use React and TypeScript daily.')
  })

  it('derives tags from the description', () => {
    const result = extractJobPosting(page(FULL))
    expect(result?.tags).toEqual(expect.arrayContaining(['React', 'TypeScript']))
  })

  it('finds a JobPosting inside an @graph wrapper', () => {
    const html = page(JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'Careers' },
        { '@type': 'JobPosting', title: 'Backend Engineer', hiringOrganization: { name: 'Globex' } },
      ],
    }))
    expect(extractJobPosting(html)?.role).toBe('Backend Engineer')
  })

  it('finds a JobPosting inside a top-level array', () => {
    const html = page(JSON.stringify([
      { '@type': 'BreadcrumbList' },
      { '@type': 'JobPosting', title: 'Data Analyst', hiringOrganization: { name: 'Initech' } },
    ]))
    expect(extractJobPosting(html)?.role).toBe('Data Analyst')
  })

  it('accepts an array-valued @type', () => {
    const html = page(JSON.stringify({
      '@type': ['JobPosting', 'Thing'],
      title: 'QA Engineer',
      hiringOrganization: { name: 'Umbrella' },
    }))
    expect(extractJobPosting(html)?.role).toBe('QA Engineer')
  })

  it('takes the first entry when jobLocation is an array', () => {
    const html = page(JSON.stringify({
      '@type': 'JobPosting',
      title: 'DevOps Engineer',
      hiringOrganization: { name: 'Acme' },
      jobLocation: [
        { address: { addressLocality: 'Penang' } },
        { address: { addressLocality: 'Ipoh' } },
      ],
    }))
    expect(extractJobPosting(html)?.location).toBe('Penang')
  })

  it('substitutes the sentinel when hiringOrganization is missing', () => {
    const html = page(JSON.stringify({ '@type': 'JobPosting', title: 'Solo Role' }))
    const result = extractJobPosting(html)
    expect(result?.role).toBe('Solo Role')
    expect(result?.company).toBe('Unknown Company')
  })

  it('substitutes the sentinel when title is missing', () => {
    const html = page(JSON.stringify({ '@type': 'JobPosting', hiringOrganization: { name: 'Acme' } }))
    const result = extractJobPosting(html)
    expect(result?.company).toBe('Acme')
    expect(result?.role).toBe('Unknown Role')
  })

  it('returns null when both title and company are missing', () => {
    const html = page(JSON.stringify({ '@type': 'JobPosting', datePosted: '2026-08-01' }))
    expect(extractJobPosting(html)).toBeNull()
  })

  it('formats a single salary value', () => {
    const html = page(JSON.stringify({
      '@type': 'JobPosting',
      title: 'Engineer',
      hiringOrganization: { name: 'Acme' },
      baseSalary: { currency: 'USD', value: { value: 150000, unitText: 'YEAR' } },
    }))
    expect(extractJobPosting(html)?.salary_range).toBe('USD 150,000/yr')
  })

  it('formats a minimum-only salary', () => {
    const html = page(JSON.stringify({
      '@type': 'JobPosting',
      title: 'Engineer',
      hiringOrganization: { name: 'Acme' },
      baseSalary: { currency: 'RM', value: { minValue: 5000, unitText: 'MONTH' } },
    }))
    expect(extractJobPosting(html)?.salary_range).toBe('RM 5,000+/mo')
  })

  it('leaves salary undefined when baseSalary is absent', () => {
    const html = page(JSON.stringify({
      '@type': 'JobPosting', title: 'Engineer', hiringOrganization: { name: 'Acme' },
    }))
    expect(extractJobPosting(html)?.salary_range).toBeUndefined()
  })

  it('returns null when the page has no JSON-LD at all', () => {
    expect(extractJobPosting('<html><body><h1>Engineer</h1></body></html>')).toBeNull()
  })

  it('skips a malformed block and reads the next one', () => {
    const html = `<script type="application/ld+json">{ not json </script>` +
      page(JSON.stringify({ '@type': 'JobPosting', title: 'Survivor', hiringOrganization: { name: 'Acme' } }))
    expect(extractJobPosting(html)?.role).toBe('Survivor')
  })

  it('skips a non-JobPosting block and reads the next one', () => {
    const html = page(JSON.stringify({ '@type': 'Organization', name: 'Acme' })) +
      page(JSON.stringify({ '@type': 'JobPosting', title: 'Second Block', hiringOrganization: { name: 'Acme' } }))
    expect(extractJobPosting(html)?.role).toBe('Second Block')
  })

  it('does not pollute Object.prototype from a __proto__ payload', () => {
    const html = page('{"@type":"JobPosting","title":"X","hiringOrganization":{"name":"Y"},"__proto__":{"polluted":"yes"}}')
    extractJobPosting(html)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/extract/jsonld.test.ts`
Expected: FAIL — cannot resolve `@/lib/extract/jsonld`.

- [ ] **Step 3: Write the implementation**

Create `lib/extract/jsonld.ts`:

```ts
import type { ParsedJob } from '@/types'
import { matchDictionary, normalizeTag } from '@/lib/skills'
import { htmlToText } from './html-to-text'

const SCRIPT_BLOCK =
  /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

function hasType(node: JsonObject, type: string): boolean {
  const declared = node['@type']
  if (typeof declared === 'string') return declared === type
  if (Array.isArray(declared)) return declared.includes(type)
  return false
}

// A JSON-LD document may be a bare node, an array of nodes, or an @graph wrapper.
function findJobPosting(root: unknown, depth = 0): JsonObject | null {
  if (depth > 5) return null
  if (Array.isArray(root)) {
    for (const item of root) {
      const found = findJobPosting(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (!isObject(root)) return null
  if (hasType(root, 'JobPosting')) return root
  return findJobPosting(root['@graph'], depth + 1)
}

function readCompany(node: JsonObject): string | undefined {
  const org = node['hiringOrganization']
  if (typeof org === 'string') return str(org)
  if (isObject(org)) return str(org['name'])
  return undefined
}

function readLocation(node: JsonObject): string | undefined {
  const raw = node['jobLocation']
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first === 'string') return str(first)
  if (!isObject(first)) return undefined

  const address = first['address']
  if (typeof address === 'string') return str(address)
  if (!isObject(address)) return undefined

  const parts = [str(address['addressLocality']), str(address['addressRegion'])].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return str(address['addressCountry'])
}

const UNIT_LABELS: Record<string, string> = {
  HOUR: '/hr', DAY: '/day', WEEK: '/wk', MONTH: '/mo', YEAR: '/yr',
}

function readSalary(node: JsonObject): string | undefined {
  const base = node['baseSalary']
  if (!isObject(base)) return undefined

  const value = base['value']
  const amount = isObject(value) ? value : base

  const min = num(amount['minValue'])
  const max = num(amount['maxValue'])
  const single = num(amount['value'])

  const currency = str(base['currency']) ?? str(base['currencyCode'])
  const prefix = currency ? `${currency} ` : ''
  const unit = UNIT_LABELS[String(amount['unitText'] ?? '').toUpperCase()] ?? ''
  const fmt = (n: number) => n.toLocaleString('en-US')

  if (min !== undefined && max !== undefined) return `${prefix}${fmt(min)} - ${fmt(max)}${unit}`
  if (min !== undefined) return `${prefix}${fmt(min)}+${unit}`
  if (single !== undefined) return `${prefix}${fmt(single)}${unit}`
  return undefined
}

// Reads named fields one at a time and never spreads the parsed object, so a
// __proto__ or constructor key in attacker-controlled JSON cannot pollute.
function mapJobPosting(node: JsonObject): ParsedJob | null {
  const role = str(node['title'])
  const company = readCompany(node)
  if (!role && !company) return null

  const description = htmlToText(str(node['description']) ?? '')

  return {
    company: company ?? 'Unknown Company',
    role: role ?? 'Unknown Role',
    salary_range: readSalary(node),
    location: readLocation(node),
    tags: [...new Set(matchDictionary(description).map(normalizeTag))],
    description,
  }
}

export function extractJobPosting(html: string): ParsedJob | null {
  for (const match of html.matchAll(SCRIPT_BLOCK)) {
    const raw = match[1]?.trim()
    if (!raw) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue // one malformed block must not stop the others
    }

    const node = findJobPosting(parsed)
    if (!node) continue

    const mapped = mapJobPosting(node)
    if (mapped) return mapped
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/extract/jsonld.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/extract/jsonld.ts __tests__/lib/extract/jsonld.test.ts
git commit -m "feat: extract schema.org JobPosting JSON-LD into ParsedJob"
```

---

### Task 5: Per-user rate limit

**Files:**
- Create: `lib/extract/rate-limit.ts`
- Test: `__tests__/lib/extract/rate-limit.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `checkRateLimit(userId: string, now?: number): boolean` — `true` when the request is allowed. The injectable `now` is what makes it testable without fake timers.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/extract/rate-limit.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { checkRateLimit, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from '@/lib/extract/rate-limit'

describe('checkRateLimit', () => {
  it('allows requests up to the limit', () => {
    const now = 1_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(checkRateLimit('user-allow', now)).toBe(true)
    }
  })

  it('rejects the request past the limit', () => {
    const now = 2_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit('user-reject', now)
    expect(checkRateLimit('user-reject', now)).toBe(false)
  })

  it('allows again once the window has passed', () => {
    const now = 3_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit('user-window', now)
    expect(checkRateLimit('user-window', now)).toBe(false)
    expect(checkRateLimit('user-window', now + RATE_LIMIT_WINDOW_MS + 1)).toBe(true)
  })

  it('tracks each user separately', () => {
    const now = 4_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit('user-a', now)
    expect(checkRateLimit('user-a', now)).toBe(false)
    expect(checkRateLimit('user-b', now)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/extract/rate-limit.test.ts`
Expected: FAIL — cannot resolve `@/lib/extract/rate-limit`.

- [ ] **Step 3: Write the implementation**

Create `lib/extract/rate-limit.ts`:

```ts
export const RATE_LIMIT_WINDOW_MS = 60_000
export const RATE_LIMIT_MAX = 10

const MAX_TRACKED_USERS = 1000

const hits = new Map<string, number[]>()

// In-memory and per-instance: this resets on cold start, so on serverless it is
// a speed bump against casual abuse rather than a real quota. Redis is the
// upgrade path if abuse actually shows up.
export function checkRateLimit(userId: string, now: number = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((at) => now - at < RATE_LIMIT_WINDOW_MS)

  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(userId, recent)
    return false
  }

  recent.push(now)
  hits.set(userId, recent)

  if (hits.size > MAX_TRACKED_USERS) {
    for (const [key, times] of hits) {
      if (times.every((at) => now - at >= RATE_LIMIT_WINDOW_MS)) hits.delete(key)
    }
  }

  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/extract/rate-limit.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/extract/rate-limit.ts __tests__/lib/extract/rate-limit.test.ts
git commit -m "feat: add per-user in-memory rate limit for URL fetching"
```

---

### Task 6: Guarded page fetch

No unit tests here — this module is network I/O, and mocking `fetch` well enough to prove anything about SSRF would test the mock, not the code. Its pure dependencies are already covered by Task 2. It is exercised for real in Task 9.

**Files:**
- Create: `lib/extract/fetch-page.ts`

**Interfaces:**
- Consumes: `assertSafeUrl`, `assertPublicHost` (Task 2); `ExtractError` (Task 2).
- Produces: `fetchJobPage(rawUrl: string): Promise<string>` — returns HTML, throws `ExtractError`.

- [ ] **Step 1: Write the implementation**

Create `lib/extract/fetch-page.ts`:

```ts
import { ExtractError } from './errors'
import { assertSafeUrl, assertPublicHost } from './url-guard'

const TIMEOUT_MS = 8000
const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3
const USER_AGENT = 'JobTrackrBot/1.0 (job posting reader)'
const HTML_CONTENT_TYPES = ['text/html', 'application/xhtml+xml']

export async function fetchJobPage(rawUrl: string): Promise<string> {
  let url = assertSafeUrl(rawUrl)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname)

    let res: Response
    try {
      res = await fetch(url, {
        // Manual redirects: a public page must not be able to bounce us to an
        // internal address without re-validation.
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml',
        },
      })
    } catch (error) {
      const name = error instanceof Error ? error.name : ''
      if (name === 'TimeoutError' || name === 'AbortError') throw new ExtractError('timeout')
      throw new ExtractError('network')
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new ExtractError('network')
      url = assertSafeUrl(new URL(location, url).toString())
      continue
    }

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new ExtractError('blocked')
    }
    if (!res.ok) throw new ExtractError('network')

    const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
    if (!HTML_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
      throw new ExtractError('not_html')
    }

    return readCapped(res)
  }

  throw new ExtractError('network')
}

// Caps by counting bytes off the stream rather than trusting Content-Length.
async function readCapped(res: Response): Promise<string> {
  if (!res.body) throw new ExtractError('network')

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) {
        await reader.cancel()
        throw new ExtractError('too_large')
      }
      chunks.push(value)
    }
  } catch (error) {
    if (error instanceof ExtractError) throw error
    throw new ExtractError('network')
  }

  const merged = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8').decode(merged)
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify existing tests still pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 4: Commit**

```bash
git add lib/extract/fetch-page.ts
git commit -m "feat: add guarded job page fetch with manual redirect validation"
```

---

### Task 7: Fetch endpoint

**Files:**
- Create: `app/api/jobs/fetch-url/route.ts`

**Interfaces:**
- Consumes: `fetchJobPage` (Task 6), `extractJobPosting` (Task 4), `htmlToText` (Task 3), `checkRateLimit` (Task 5), `ExtractError` / `EXTRACT_ERROR_MESSAGES` / `ExtractErrorCode` (Task 2), `createClient` from `@/lib/supabase/server`, `MAX_TEXT_LENGTH` from `@/lib/constants`.
- Produces: `POST /api/jobs/fetch-url`
  - Request: `{ url: string }`
  - Success: `{ data: { jobPosting: ParsedJob | null, text: string | null } }` — exactly one non-null
  - Failure: `{ error: string }`

- [ ] **Step 1: Write the implementation**

Create `app/api/jobs/fetch-url/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MAX_TEXT_LENGTH } from '@/lib/constants'
import { ExtractError, EXTRACT_ERROR_MESSAGES, type ExtractErrorCode } from '@/lib/extract/errors'
import { fetchJobPage } from '@/lib/extract/fetch-page'
import { extractJobPosting } from '@/lib/extract/jsonld'
import { htmlToText } from '@/lib/extract/html-to-text'
import { checkRateLimit } from '@/lib/extract/rate-limit'

// dns.promises in the URL guard requires the Node.js runtime.
export const runtime = 'nodejs'

const STATUS_BY_CODE: Record<ExtractErrorCode, number> = {
  invalid_url: 400,
  rate_limited: 429,
  not_html: 415,
  timeout: 504,
  blocked: 502,
  too_large: 502,
  network: 502,
}

function fail(code: ExtractErrorCode) {
  return NextResponse.json({ error: EXTRACT_ERROR_MESSAGES[code] }, { status: STATUS_BY_CODE[code] })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    if (!checkRateLimit(user.id)) return fail('rate_limited')

    const body: unknown = await req.json()
    const rawUrl = typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>).url
      : undefined
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) return fail('invalid_url')

    const html = await fetchJobPage(rawUrl.trim())
    const jobPosting = extractJobPosting(html)

    if (jobPosting) {
      return NextResponse.json({
        data: {
          jobPosting: {
            ...jobPosting,
            description: jobPosting.description.slice(0, MAX_TEXT_LENGTH),
          },
          text: null,
        },
      })
    }

    return NextResponse.json({
      data: { jobPosting: null, text: htmlToText(html).slice(0, MAX_TEXT_LENGTH) },
    })
  } catch (error) {
    // Log the code only — never the fetched body, never the URL.
    if (error instanceof ExtractError) {
      console.error('[jobs/fetch-url]', error.code)
      return fail(error.code)
    }
    console.error('[jobs/fetch-url]', error)
    return NextResponse.json({ error: EXTRACT_ERROR_MESSAGES.network }, { status: 502 })
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify the route rejects unauthenticated callers**

Start the dev server (`npm run dev`), then from a terminal with no session cookie:

```bash
curl -s -X POST http://localhost:3000/api/jobs/fetch-url \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

Expected: `{"error":"Not authenticated."}`

- [ ] **Step 4: Commit**

```bash
git add app/api/jobs/fetch-url/route.ts
git commit -m "feat: add authenticated job URL fetch endpoint"
```

---

### Task 8: Client wiring

**Files:**
- Modify: `hooks/useParser.ts` (whole file replaced below)
- Modify: `components/jobs/ParseInput.tsx:17-40` (props type, handler) and `:83-91` (button)
- Modify: `app/(dashboard)/jobs/new/page.tsx:15` (parsed state type)

**Interfaces:**
- Consumes: `isSingleUrl` (Task 1), `EXTRACT_ERROR_MESSAGES` (Task 2), the endpoint (Task 7), existing `parseJobDescription`, `matchCustomTags`, `normalizeTag`.
- Produces: `type ParsedJobWithUrl = ParsedJob & { url?: string }` exported from `hooks/useParser.ts`; `useParser()` now returns `{ result, loading, parse, parseFromUrl, reset }`.

Two things to get right here. First, the server has no access to per-user custom tags, so the JSON-LD path merges them in client-side. Second, every failure path still opens the form with `url` prefilled — the pasted link is never lost.

- [ ] **Step 1: Replace the parser hook**

Replace the whole of `hooks/useParser.ts`:

```ts
'use client'

import { useState } from 'react'
import { parseJobDescription } from '@/lib/parser'
import { matchCustomTags, normalizeTag } from '@/lib/skills'
import { EXTRACT_ERROR_MESSAGES } from '@/lib/extract/errors'
import type { ParsedJob } from '@/types'

export type ParsedJobWithUrl = ParsedJob & { url?: string }

interface FetchUrlResponse {
  jobPosting: ParsedJob | null
  text: string | null
}

export function useParser() {
  const [result, setResult] = useState<ParsedJob | null>(null)
  const [loading, setLoading] = useState(false)

  function parse(text: string, customTags: string[] = []) {
    if (!text.trim()) {
      setResult(null)
      return null
    }
    const parsed = parseJobDescription(text, customTags)
    setResult(parsed)
    return parsed
  }

  // Throws Error with a user-facing message on failure; caller shows the toast.
  async function parseFromUrl(url: string, customTags: string[] = []): Promise<ParsedJob | null> {
    setLoading(true)
    try {
      let json: { data?: FetchUrlResponse; error?: string }
      try {
        const res = await fetch('/api/jobs/fetch-url', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        json = await res.json()
        if (!res.ok) throw new Error(json?.error ?? EXTRACT_ERROR_MESSAGES.network)
      } catch (error) {
        if (error instanceof Error && error.message) throw error
        throw new Error(EXTRACT_ERROR_MESSAGES.network)
      }

      const data = json.data
      if (!data) throw new Error(EXTRACT_ERROR_MESSAGES.network)

      if (data.jobPosting) {
        // The server cannot see this user's learned tags, so merge them here.
        const custom = matchCustomTags(data.jobPosting.description, customTags).map(normalizeTag)
        const merged: ParsedJob = {
          ...data.jobPosting,
          tags: [...new Set([...data.jobPosting.tags, ...custom])],
        }
        setResult(merged)
        return merged
      }

      return parse(data.text ?? '', customTags)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
  }

  return { result, loading, parse, parseFromUrl, reset }
}
```

- [ ] **Step 2: Verify the hook type-checks**

Run: `npx tsc --noEmit`
Expected: errors only in `ParseInput.tsx` / `new/page.tsx` (they do not yet pass `url`). Those are fixed in the next steps.

- [ ] **Step 3: Rewrite the ParseInput props and handler**

In `components/jobs/ParseInput.tsx`, replace the import block and everything from `interface Props` through the end of `handleExtract` with:

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Sparkles, ChevronRight, FileText, Loader2 } from 'lucide-react'
import { useParser, type ParsedJobWithUrl } from '@/hooks/useParser'
import { useTags } from '@/contexts/TagsProvider'
import { isSingleUrl } from '@/lib/url'
import { EXTRACT_ERROR_MESSAGES } from '@/lib/extract/errors'
import { stagger, fadeUp } from '@/lib/animations'
import type { ParsedJob } from '@/types'

interface Props {
  onParsed: (parsed: ParsedJobWithUrl) => void
  onManual: () => void
}

export function ParseInput({ onParsed, onManual }: Props) {
  const [text, setText] = useState('')
  const { result, loading, parse, parseFromUrl } = useParser()
  const { customTags } = useTags()

  function reportFieldsFound(parsed: ParsedJob) {
    const fieldsFound = [
      parsed.company !== 'Unknown Company',
      Boolean(parsed.role) && parsed.role !== 'Unknown Role',
      Boolean(parsed.salary_range),
      Boolean(parsed.location),
      parsed.tags.length > 0,
    ].filter(Boolean).length

    if (fieldsFound >= 4) {
      toast.success('Details extracted — review and confirm')
    } else if (fieldsFound > 0) {
      toast.warning("Some fields couldn't be detected — fill them in below")
    } else {
      toast.error("Couldn't extract details. Fill in the fields manually.", { duration: Infinity })
    }
  }

  // Opens the form with only the link filled in, so a failed fetch never loses it.
  function fallbackToForm(url: string) {
    onParsed({ company: '', role: '', tags: [], description: '', url })
  }

  async function handleExtract() {
    const url = isSingleUrl(text)

    if (!url) {
      const parsed = parse(text, customTags)
      if (!parsed) return
      reportFieldsFound(parsed)
      onParsed(parsed)
      return
    }

    try {
      const parsed = await parseFromUrl(url, customTags)
      if (!parsed) {
        toast.error("Couldn't read anything from that link. Paste the description text instead.", { duration: Infinity })
        fallbackToForm(url)
        return
      }
      reportFieldsFound(parsed)
      onParsed({ ...parsed, url })
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : EXTRACT_ERROR_MESSAGES.network
      toast.error(message, { duration: Infinity })
      fallbackToForm(url)
    }
  }
```

Leave the rest of the component (the `fields` array, the JSX) as it is, apart from the button change in the next step.

- [ ] **Step 4: Add the loading state to the Extract button**

In the same file, replace the Extract button (`components/jobs/ParseInput.tsx`, currently lines 83-91) with:

```tsx
        <button
          type="button"
          onClick={handleExtract}
          disabled={!text.trim() || loading}
          className="w-full sm:w-auto px-6 py-3.5 bg-accent text-white font-semibold text-sm rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {loading ? 'Reading link…' : 'Extract Job Details'}
        </button>
```

- [ ] **Step 5: Update the page state type**

In `app/(dashboard)/jobs/new/page.tsx`, change the import and the `parsed` state:

```tsx
import { JobForm, type JobFormValues } from '@/components/jobs/JobForm'
import type { ParsedJobWithUrl } from '@/hooks/useParser'
```

```tsx
  const [parsed, setParsed] = useState<ParsedJobWithUrl | null>(null)
```

`JobForm` already reads `url` from `initial` when the key is present (`components/jobs/JobForm.tsx:43`), so no change is needed there.

- [ ] **Step 6: Update the hint chip copy**

In `components/jobs/ParseInput.tsx`, the chip currently reads "Supports LinkedIn, Indeed, Glassdoor" — which is exactly backwards for the URL path, since those are the sites that block us. Replace it with:

```tsx
        <span className="text-[10px] text-brand-muted px-2 py-1 bg-surface-muted rounded-md uppercase tracking-wider font-semibold">
          Paste text or a link
        </span>
```

- [ ] **Step 7: Verify everything type-checks and lints**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Verify the full test suite passes**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 9: Commit**

```bash
git add hooks/useParser.ts components/jobs/ParseInput.tsx "app/(dashboard)/jobs/new/page.tsx"
git commit -m "feat: extract job details from a pasted posting URL"
```

---

### Task 9: End-to-end verification

The pure modules are unit-tested; this task proves the parts that talk to the network actually work. No step here is optional — the spec's whole premise is that real ATS pages carry JSON-LD, and that claim is unverified until it is checked against real pages.

**Files:** none changed unless a defect is found.

- [ ] **Step 1: Start the dev server and sign in**

Run: `npm run dev`, open `http://localhost:3000`, sign in, navigate to Add Job.

- [ ] **Step 2: Verify the JSON-LD path against a real Greenhouse posting**

Find a live posting at `boards.greenhouse.io` (search "greenhouse.io jobs" for any company's board). Paste the URL alone into the box and click Extract.

Expected: button shows "Reading link…", then the review form opens with company, role, and description filled, the Job URL field holding the pasted link, and tags detected from the description.

- [ ] **Step 3: Verify the JSON-LD path against Lever and Ashby**

Repeat Step 2 with a posting on `jobs.lever.co` and one on `jobs.ashbyhq.com`.

Expected: same result. Record which fields came through empty for each — location and salary are commonly absent from real postings, and that is acceptable, but company and role being empty is a defect worth investigating.

- [ ] **Step 4: Verify the blocked-site message**

Paste a LinkedIn job URL (`https://www.linkedin.com/jobs/view/...`) and click Extract.

Expected: a toast reading "That site blocks automatic reading. Paste the description text instead." The form opens with only the Job URL prefilled. Confirm the copy does not read as an app failure.

- [ ] **Step 5: Verify the text fallback path still works**

Paste a plain multi-line job description (no URL) and click Extract.

Expected: unchanged behaviour from before this feature — the existing parser fills the form.

- [ ] **Step 6: Verify a link embedded in prose takes the text path**

Paste a description that contains a URL somewhere in the middle.

Expected: no network request in the Network tab; the text parser handles it.

- [ ] **Step 7: Verify the SSRF guard rejects an internal address**

With the dev server running and a signed-in session, paste `https://169.254.169.254/latest/meta-data` and click Extract.

Expected: toast "That doesn't look like a job posting link." Server console logs `[jobs/fetch-url] invalid_url`. Confirm no request was actually made to that address.

- [ ] **Step 8: Verify the production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 9: Commit any fixes**

If Steps 2-8 surfaced defects, fix them and commit. If everything passed with no changes, there is nothing to commit — say so rather than creating an empty commit.

---

## Verification Summary

After Task 9, all of the following must be true, each confirmed by having run the command and read the output:

- `npm test` passes, including the five new suites (`url`, `url-guard`, `html-to-text`, `jsonld`, `rate-limit`).
- `npx tsc --noEmit` reports no errors.
- `npm run lint` reports no errors.
- `npm run build` succeeds.
- A real Greenhouse, Lever, and Ashby posting each prefill company and role from a pasted URL.
- A LinkedIn URL produces the blocked-site message with the URL preserved in the form.
- `https://169.254.169.254/...` is rejected before any network call.
- `package.json` dependencies are unchanged from the pre-feature state.
