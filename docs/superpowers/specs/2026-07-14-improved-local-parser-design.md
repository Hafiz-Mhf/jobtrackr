# Upgraded Heuristic Local Parser — Design

**Date:** 2026-07-14
**Status:** Under Review

## Problem
The current client-side parser in [parser.ts](file:///d:/jobtrackr/lib/parser.ts) and [skills.ts](file:///d:/jobtrackr/lib/skills.ts) relies on simple regex heuristics that are fragile and result in extraction failures for many standard job descriptions:
1. **Company Extraction**: Frequently defaults to "Unknown Company" or grabs navigation text because it lacks understanding of common legal suffixes and layout noise.
2. **Role Extraction**: Fails to isolate clean role titles from line segments with pipes/dashes, and misses common QA, Product Management, and Design keywords.
3. **Salary Extraction**: Only matches USD (`$`) values and simple `k` formats, missing Malaysian ringgits (`RM`/`MYR`), Singapore dollars (`SGD`), euros/pounds, hourly/monthly rates, and custom range wordings.
4. **Location Extraction**: Limited to a hardcoded Malaysian city list, basic remote/hybrid keywords, and simple "City, State" formats.
5. **Skill Tag Extraction**: Fails to match tags with special characters (like `C#`, `C++`, or `.NET`) because regex `\b` (word-boundary) does not work when adjacent to punctuation/symbols.

## Goals
- Increase extraction accuracy of company, role, salary, location, and tags from natural language job descriptions.
- Keep extraction **100% offline, client-side, and instant** (per CLAUDE.md) with zero external API dependencies or costs.
- Support international/regional currencies and work arrangement combinations (e.g. "Kuala Lumpur (Hybrid)").
- Support symbol-safe matching for tech tags containing special characters (e.g., `C++`, `C#`, `.NET`).

## Non-goals (YAGNI)
- Implementing machine learning, web scraping, or server-side parsing.
- Storing parser history in the database.

## Constraints
- No AI or external LLM API package may be used (retaining the "zero external cost" commitment).
- Must run instantly on the user's browser inside `ParseInput`.

---

## Proposed Changes

### 1. Company Name Extraction (`extractCompany`)
We will rewrite `extractCompany` to:
- Detect corporate legal suffixes like `Sdn Bhd`, `Bhd`, `LLC`, `Ltd`, `Inc`, `Corp`, `Corporation`, `Pte Ltd`. If matched, the preceding words on that line are extracted as the company name.
- Filter out common navigation or layout header noise (e.g., `"Apply Now"`, `"Easy Apply"`, `"Saved"`, `"Posted 3 days ago"`, `"About the Job"`, `"Requirements"`).
- Improve the `"at <Company>"` extraction to support more varied casing.

```ts
const LEGAL_SUFFIX_REGEX = /\b(Sdn\s*Bhd|Bhd|LLC|Ltd|Inc|Corp|Corporation|Pte\s*Ltd|Co|Group|Solutions|Systems)\b/i

const NOISE_LINES = /^(apply|share|save|posted|about|requirements|description|responsibilities|job|overview|company|employer|organization|search|sign\s*in|login|register)\b/i
```

### 2. Role Title Extraction (`extractRole`)
We will rewrite `extractRole` to:
- Split the matching line by standard pipeline delimiters (`|`, `·`, `•`, `-`, `–`) and extract the first segment (which usually contains the actual title).
- Expand the `ROLE_KEYWORDS` regex to cover product management, Scrum, QA, testing, designers, UI/UX, and SRE.
- Match seniority level prefixes (`Junior`, `Senior`, `Lead`, `Principal`, `Staff`, `Associate`, `Director`, `Head of`) and combine them cleanly with the role keyword.

### 3. Salary Range Extraction (`extractSalary`)
We will rewrite `extractSalary` to:
- Match multi-currency indicators: `RM`, `MYR`, `SGD`, `USD`, `$`, `£`, `€`, `¥`, `Rs`.
- Support ranges with `to`, `-`, `–`, or `/`.
- Capture pay frequency indicators: hourly (`/hr`, `hourly`), monthly (`/mo`, `monthly`), and annual (`/yr`, `annually`).
- Support multiplier letters like `k` or `K` (e.g. `8k` -> `8,000` or just keeping it raw).

```ts
const SALARY_REGEX = /(?:RM|MYR|SGD|USD|\$|£|€|¥|Rs)\s*\d+(?:[\d,.]*\d)?\s*[kK]?(?:\s*(?:-|–|to)\s*(?:RM|MYR|SGD|USD|\$|£|€|¥|Rs)?\s*\d+(?:[\d,.]*\d)?\s*[kK]?)?(?:\s*(?:\/|per\s+)?(?:yr|year|annually|mo|month|monthly|hr|hour|hourly))?/i
```

### 4. Location Extraction (`extractLocation`)
We will rewrite `extractLocation` to:
- Parse work arrangements: `Remote`, `Hybrid`, `On-site`/`Onsite`, `In-office`, `Office-based`, `Work from home`, `WFH`.
- Identify geographic configurations matching `City, Country` or `City, State` patterns using capitalized regex boundaries.
- If both a geographic location and a work arrangement are found on the same line or nearby, format them together (e.g., `"Kuala Lumpur (Hybrid)"`).

### 5. Symbol-Safe Tag Matching (`lib/skills.ts`)
We will upgrade the regex compiler in `lib/skills.ts` to detect if a tag or alias contains special characters (non-word characters).
- If it does (e.g., `C++`, `C#`, `.NET`), we will bypass standard `\b` word boundaries (which fail because symbol boundaries aren't considered word boundaries in regex) and use a custom character boundary set (whitespace or standard punctuation):
  `/(?:^|\s|[.,;!?()\[\]{}'"])(C\+\+|C#|\.NET)(?=$|\s|[.,;!?()\[\]{}'"])/i`
- If it doesn't contain special characters, we continue to use standard `\b` boundaries to avoid false positives.

```ts
function compileTagRegex(tag: string): RegExp {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const hasSpecialChar = /[^a-zA-Z0-9\s]/.test(tag)
  if (hasSpecialChar) {
    // Symbol-safe boundary: matches start of text/whitespace/punctuation on left,
    // and end of text/whitespace/punctuation on the right.
    return new RegExp(`(?:^|\\s|[.,;!?()[\\]{}'"])${escaped}(?=$|\\s|[.,;!?()[\\]{}'"])`, 'i')
  }
  const isCaseSensitive = CASE_SENSITIVE_TERMS.has(tag)
  return new RegExp(`\\b${escaped}\\b`, isCaseSensitive ? '' : 'i')
}
```

---

## Verification Plan

### Automated Tests
We will add new tests or extend existing tests in:
- `__tests__/lib/parser.test.ts` (test cases for legal suffixes, split pipes, multi-currency salaries, combined location formats).
- `__tests__/lib/skills.test.ts` (test cases for special character symbols like `C#`, `C++`, `.NET` matching correctly in prose sentences).

Run unit tests via:
```bash
npx vitest run
```

### Manual Verification
1. Open the "Add Job" interface.
2. Paste a set of test job descriptions (varying from Malaysian corporate posts, international remote roles, and highly technical descriptions containing `C++` or `C#`).
3. Verify that fields are extracted with high accuracy and tech tags match perfectly.
