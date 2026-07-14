# Improved Local Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the offline client-side job description parser with advanced heuristics for company, role, salary, location, and symbol-safe tags.

**Architecture:** We will modify `lib/skills.ts` to implement symbol-safe regex matching and `lib/parser.ts` to improve regex heuristical parsing. Comprehensive tests will be added in `__tests__/lib/skills.test.ts` and `__tests__/lib/parser.test.ts` to ensure 100% test coverage.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Vitest.

## Global Constraints
- No AI or external LLM API package (no `@anthropic-ai/sdk`, etc.).
- 100% offline client-side parsing.
- TypeScript strictly - no `any`.
- Standard named exports for components, default exports for pages.
- Parser logic lives in `lib/parser.ts` and `lib/skills.ts` only.

---

### Task 1: Symbol-Safe Tag Matching

**Files:**
- Modify: `lib/skills.ts`
- Test: `__tests__/lib/skills.test.ts`

**Interfaces:**
- Consumes: None
- Produces: Updated regex compilation logic inside `lib/skills.ts` that safely handles special character symbols (e.g. `C++`, `C#`, `.NET`).

- [ ] **Step 1: Write the failing tests**
  Add these test cases to `__tests__/lib/skills.test.ts`:
  ```ts
  it('matches symbols like C++, C#, and .NET correctly without being blocked by word boundaries', () => {
    expect(matchDictionary('We are looking for a C++ developer with .NET experience')).toEqual(expect.arrayContaining(['C++', '.NET']))
    expect(matchDictionary('Writing clean C# code.')).toContain('C#')
  })
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run __tests__/lib/skills.test.ts`
  Expected: FAIL (either doesn't match C++, C#, or .NET or fails compilation)

- [ ] **Step 3: Write minimal implementation**
  Modify `lib/skills.ts` to compile regexes using a symbol-safe boundary fallback helper:
  ```ts
  function compileTagRegex(tag: string): RegExp {
    const escaped = escapeRegex(tag)
    const hasSpecialChar = /[^a-zA-Z0-9\s]/.test(tag)
    const flags = CASE_SENSITIVE_TERMS.has(tag) ? '' : 'i'
    if (hasSpecialChar) {
      // Symbol-safe boundary: matches start of text/whitespace/punctuation on left,
      // and end of text/whitespace/punctuation on the right.
      return new RegExp(`(?:^|\\s|[.,;!?()[\\]{}'"])${escaped}(?=$|\\s|[.,;!?()[\\]{}'"])`, flags)
    }
    return new RegExp(`\\b${escaped}\\b`, flags)
  }
  ```
  Update the loop building `COMPILED` array:
  ```ts
  const COMPILED: { canonical: string; re: RegExp }[] = []
  for (const entry of SKILLS) {
    for (const term of [entry.canonical, ...entry.aliases]) {
      COMPILED.push({ canonical: entry.canonical, re: compileTagRegex(term) })
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run __tests__/lib/skills.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lib/skills.ts __tests__/lib/skills.test.ts
  git commit -m "feat: implement symbol-safe tag matching for special character skills"
  ```

---

### Task 2: Advanced Company Extraction

**Files:**
- Modify: `lib/parser.ts`
- Test: `__tests__/lib/parser.test.ts`

**Interfaces:**
- Consumes: `parseJobDescription` in `lib/parser.ts`
- Produces: Upgraded `extractCompany` with legal corporate suffix detection and layout noise filtering.

- [ ] **Step 1: Write the failing tests**
  Add these test cases to `__tests__/lib/parser.test.ts`:
  ```ts
  it('extracts company name using corporate legal suffixes', () => {
    const result = parseJobDescription('Job description for Tech Solutions Sdn Bhd\nWe are looking for...')
    expect(result.company).toBe('Tech Solutions Sdn Bhd')
  })

  it('filters out common noise lines when parsing company name', () => {
    const result = parseJobDescription('Apply Now\nPosted 3 days ago\nStripe\nSenior Engineer')
    expect(result.company).toBe('Stripe')
  })
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run __tests__/lib/parser.test.ts`
  Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
  Add legal suffix and noise line regex constants in `lib/parser.ts`:
  ```ts
  const LEGAL_SUFFIX_REGEX = /\b(Sdn\s*Bhd|Bhd|LLC|Ltd|Inc|Corp|Corporation|Pte\s*Ltd|Co|Group|Solutions|Systems)\b/i
  const NOISE_LINES = /^(apply|share|save|posted|about|requirements|description|responsibilities|job|overview|company|employer|organization|search|sign\s*in|login|register)\b/i
  ```
  Update `extractCompany(text)` in `lib/parser.ts`:
  ```ts
  function extractCompany(text: string): string {
    const lines = nonEmptyLines(text)

    // 1. Explicit label: "Company:", "Employer:", "Organization:"
    const label = text.match(/^\s*(?:company|employer|organi[sz]ation)\s*[:\-]\s*(.+)$/im)
    if (label?.[1]) return cleanValue(label[1])

    // 2. Look for lines with legal corporate suffixes first (excluding headers/noise)
    for (const line of lines.slice(0, 10)) {
      if (NOISE_LINES.test(line)) continue
      const suffixMatch = line.match(LEGAL_SUFFIX_REGEX)
      if (suffixMatch && suffixMatch.index !== undefined) {
        const suffixEnd = suffixMatch.index + suffixMatch[0].length
        const companyPart = line.substring(0, suffixEnd).trim()
        if (companyPart.length > 2 && companyPart.length <= 60) {
          return companyPart
        }
      }
    }

    // 3. "at <Company>" / "@ <Company>"
    const atMatch = text.match(/\b(?:at|@)\s+([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+){0,3})/)
    if (atMatch?.[1]) return cleanValue(atMatch[1])

    // 4. First-line heuristic (excluding noise lines)
    for (const line of lines.slice(0, 5)) {
      if (NOISE_LINES.test(line)) continue
      if (isLikelyCompany(line)) return line
    }

    return 'Unknown Company'
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run __tests__/lib/parser.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lib/parser.ts __tests__/lib/parser.test.ts
  git commit -m "feat: improve company name extraction using legal suffixes and layout noise filters"
  ```

---

### Task 3: Advanced Role Title Extraction

**Files:**
- Modify: `lib/parser.ts`
- Test: `__tests__/lib/parser.test.ts`

**Interfaces:**
- Consumes: `parseJobDescription` in `lib/parser.ts`
- Produces: Upgraded `extractRole` with delimiter splitting, level prefixes, and expanded keywords.

- [ ] **Step 1: Write the failing tests**
  Add these test cases to `__tests__/lib/parser.test.ts`:
  ```ts
  it('splits pipeline delimiters to isolate clean role title', () => {
    const result = parseJobDescription('Senior Frontend Developer | Remote | Kuala Lumpur\nJoin us...')
    expect(result.role).toBe('Senior Frontend Developer')
  })

  it('matches product/design roles with seniority level prefixes', () => {
    const result = parseJobDescription('Lead UI/UX Designer\nWe are looking for...')
    expect(result.role).toBe('Lead UI/UX Designer')
  })
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run __tests__/lib/parser.test.ts`
  Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
  Update `ROLE_KEYWORDS` in `lib/parser.ts`:
  ```ts
  const ROLE_KEYWORDS =
    /\b(engineer|developer|architect|manager|analyst|consultant|designer|specialist|administrator|coordinator|scientist|technician|programmer|lead|director|intern|associate|recruiter|accountant|auditor|support|helpdesk|help\s?desk|qa|tester|scrum\s*master|sre|reliability|ui\/ux|product\s*owner)\b/i
  ```
  Update `cleanRole` to split on pipes/bullet points/dashes:
  ```ts
  function cleanRole(s: string): string {
    const base = s.split('\n')[0].split(/\s*(?:\||·|•|–|-|—)\s*/)[0]
    return base.replace(/\s*\[.*$/, '').replace(/\s+(?:at|@)\s+.*$/i, '').trim()
  }
  ```
  Update `extractRole` to support prefixes and clean fallback loops:
  ```ts
  function extractRole(text: string): string {
    const lines = nonEmptyLines(text)

    // 1. Explicit label
    const label = text.match(/^\s*(?:job\s*title|title|position|role)\s*[:\-]\s*(.+)$/im)
    if (label?.[1]) return cleanRole(label[1])

    // 2. Specific patterns (including level prefixes)
    const levelPrefix = '(?:senior|junior|mid|lead|staff|principal|associate|director|head\\s+of)?\\s*'
    const rolePattern = '(?:frontend|backend|fullstack|full\\.stack|software|web|mobile|data|devops|cloud|ml|ai|qa|test|ui/ux|product|sre|system|network)'
    const roleKeyword = '(?:engineer|developer|architect|scientist|designer|manager|specialist|analyst|owner|lead|scrum\\s*master)'
    const pattern = new RegExp(`${levelPrefix}${rolePattern}\\s*${roleKeyword}`, 'i')

    for (const line of lines.slice(0, 8)) {
      const match = line.match(pattern)
      if (match) return cleanRole(match[0])
    }

    // 3. First short line that reads like a job title
    for (const line of lines.slice(0, 8)) {
      if (line.length <= 80 && ROLE_KEYWORDS.test(line)) return cleanRole(line)
    }

    // 4. Fallback: first non-empty line (excluding noise)
    for (const line of lines.slice(0, 5)) {
      if (!NOISE_LINES.test(line) && line.length <= 60) return cleanRole(line)
    }

    return lines[0] ? cleanRole(lines[0]) : 'Unknown Role'
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run __tests__/lib/parser.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lib/parser.ts __tests__/lib/parser.test.ts
  git commit -m "feat: support delimiter splitting and level prefixes in role extraction"
  ```

---

### Task 4: Multi-Currency & Pay Frequency Salary Extraction

**Files:**
- Modify: `lib/parser.ts`
- Test: `__tests__/lib/parser.test.ts`

**Interfaces:**
- Consumes: `parseJobDescription` in `lib/parser.ts`
- Produces: Upgraded `extractSalary` with support for multi-currency structures and payment frequencies.

- [ ] **Step 1: Write the failing tests**
  Add these test cases to `__tests__/lib/parser.test.ts`:
  ```ts
  it('extracts multi-currency salary ranges and frequencies', () => {
    const r1 = parseJobDescription('Compensation: RM 5,000 - RM 8,500 / month')
    expect(r1.salary_range).toBe('RM 5,000 - RM 8,500 / month')

    const r2 = parseJobDescription('Salary: SGD 6k to 9k per month')
    expect(r2.salary_range).toBe('SGD 6k to 9k per month')

    const r3 = parseJobDescription('Offer: £45/hour on contract')
    expect(r3.salary_range).toBe('£45/hour')
  })
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run __tests__/lib/parser.test.ts`
  Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
  Update `extractSalary` in `lib/parser.ts`:
  ```ts
  function extractSalary(text: string): string | undefined {
    const salaryRegex = /(?:RM|MYR|SGD|USD|\$|£|€|¥|Rs)\s*\d+(?:[\d,.]*\d)?\s*[kK]?(?:\s*(?:-|–|to)\s*(?:RM|MYR|SGD|USD|\$|£|€|¥|Rs)?\s*\d+(?:[\d,.]*\d)?\s*[kK]?)?(?:\s*(?:\/|per\s+)?(?:yr|year|annually|mo|month|monthly|hr|hour|hourly))?/i
    const match = text.match(salaryRegex)
    return match?.[0]
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run __tests__/lib/parser.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lib/parser.ts __tests__/lib/parser.test.ts
  git commit -m "feat: support multi-currency and payment frequencies in salary parser"
  ```

---

### Task 5: Combined Work Arrangement & Geographic Location

**Files:**
- Modify: `lib/parser.ts`
- Test: `__tests__/lib/parser.test.ts`

**Interfaces:**
- Consumes: `parseJobDescription` in `lib/parser.ts`
- Produces: Upgraded `extractLocation` supporting combined location formats (e.g. "Kuala Lumpur (Hybrid)").

- [ ] **Step 1: Write the failing tests**
  Add these test cases to `__tests__/lib/parser.test.ts`:
  ```ts
  it('extracts combined work arrangement and geographic location', () => {
    const result = parseJobDescription('Office Location: George Town\nThis is a Hybrid role.')
    expect(result.location).toBe('George Town (Hybrid)')
  })

  it('extracts geographic patterns of City, Country', () => {
    const result = parseJobDescription('We are hiring in Singapore, Singapore for this role.')
    expect(result.location).toBe('Singapore, Singapore')
  })
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run __tests__/lib/parser.test.ts`
  Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
  Update `extractLocation(text)` in `lib/parser.ts`:
  ```ts
  function extractLocation(text: string): string | undefined {
    // 1. Explicit label
    const label = text.match(/^\s*(?:location|based in|office|work location)\s*[:\-]\s*(.+)$/im)
    let explicitLoc = label?.[1] ? cleanValue(label[1]) : undefined

    // 2. Remote/Hybrid/Onsite work mode detection
    const workModeMatch = text.match(/\b(remote|hybrid|on.?site|in.?office|office-based|wfh|work\s+from\s+home)\b/i)
    const workMode = workModeMatch ? workModeMatch[1].toLowerCase() : undefined
    const workModeLabel = workMode === 'wfh' || workMode === 'work from home'
      ? 'Remote'
      : workMode === 'onsite' || workMode === 'on site' || workMode === 'in office' || workMode === 'office-based'
      ? 'On-site'
      : workMode
      ? workMode.charAt(0).toUpperCase() + workMode.slice(1)
      : undefined

    if (explicitLoc) {
      if (workModeLabel && !new RegExp(workModeLabel, 'i').test(explicitLoc)) {
        return `${explicitLoc} (${workModeLabel})`
      }
      return explicitLoc
    }

    // 3. Known Malaysian city
    const myCity = matchMalaysianLocation(text)
    if (myCity) {
      if (workModeLabel && workModeLabel !== 'On-site') {
        return `${myCity} (${workModeLabel})`
      }
      return myCity
    }

    // 4. "City, State/Country" regex
    const cityMatch = text.match(/\b([A-Z][a-zA-Z\s.-]+,\s*(?:[A-Z]{2,}|[A-Z][a-zA-Z\s.-]+))\b/)
    if (cityMatch?.[1]) {
      const geoLoc = cityMatch[1].trim()
      if (workModeLabel && workModeLabel !== 'On-site' && !new RegExp(workModeLabel, 'i').test(geoLoc)) {
        return `${geoLoc} (${workModeLabel})`
      }
      return geoLoc
    }

    return workModeLabel
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run __tests__/lib/parser.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lib/parser.ts __tests__/lib/parser.test.ts
  git commit -m "feat: support combined work arrangements and geographic formats in location parser"
  ```
