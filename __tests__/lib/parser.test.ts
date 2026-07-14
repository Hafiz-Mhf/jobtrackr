import { describe, it, expect } from 'vitest'
import { parseJobDescription } from '@/lib/parser'

describe('parseJobDescription', () => {
  it('extracts company from "at <Company>" pattern', () => {
    const result = parseJobDescription('Senior Frontend Engineer at Stripe\nWe are looking for...')
    expect(result.company).toBe('Stripe')
  })

  it('extracts a known role title pattern', () => {
    const result = parseJobDescription('Senior Frontend Engineer at Stripe\nWe are looking for...')
    expect(result.role.toLowerCase()).toContain('frontend engineer')
  })

  it('falls back to the first line when no role pattern matches', () => {
    const result = parseJobDescription('Widget Wrangler III\nJoin our team...')
    expect(result.role).toBe('Widget Wrangler III')
  })

  it('extracts a salary range with $ and k suffix', () => {
    const result = parseJobDescription('Pay: $130k - $160k per year')
    expect(result.salary_range).toContain('130k')
  })

  it('returns undefined salary when none present', () => {
    const result = parseJobDescription('No compensation info here.')
    expect(result.salary_range).toBeUndefined()
  })

  it('extracts "Remote" as location', () => {
    const result = parseJobDescription('This role is fully Remote.')
    expect(result.location).toBe('Remote')
  })

  it('extracts known tech tags case-insensitively', () => {
    const result = parseJobDescription('Must know react, TypeScript and Node.js well.')
    expect(result.tags).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Node.js']))
  })

  it('does not match partial words for tags', () => {
    const result = parseJobDescription('We use Reactive Streams internally.')
    expect(result.tags).not.toContain('React')
  })

  it('preserves the original trimmed text as description', () => {
    const result = parseJobDescription('  Some JD text.  ')
    expect(result.description).toBe('Some JD text.')
  })

  it('defaults company to Unknown Company when no match', () => {
    const result = parseJobDescription('Just some text with no company marker.')
    expect(result.company).toBe('Unknown Company')
  })

  it('extracts company from an explicit "Company:" label', () => {
    const result = parseJobDescription('Company: Acme Corp\nSome other text')
    expect(result.company).toBe('Acme Corp')
  })

  it('extracts company from a short first line (LinkedIn-style paste)', () => {
    const result = parseJobDescription('Deloitte\nAbout the job\nLocation: Kuala Lumpur, MY')
    expect(result.company).toBe('Deloitte')
  })

  it('does not treat the company first line as the location', () => {
    const result = parseJobDescription('Deloitte\nAbout the job\nLocation: Kuala Lumpur, MY')
    expect(result.location).toBe('Kuala Lumpur, MY')
  })

  it('extracts role from an explicit "Job Title:" label', () => {
    const result = parseJobDescription('Deloitte\nJob Title: IT Asset Manager\nLocation: Remote')
    expect(result.role).toBe('IT Asset Manager')
  })

  it('extracts a non-engineering role from a keyword line', () => {
    const result = parseJobDescription('Deloitte\nIT Asset Manager\nWe are hiring...')
    expect(result.role).toBe('IT Asset Manager')
  })

  it('extracts location from an explicit "Location:" label', () => {
    const result = parseJobDescription('Location: Kuala Lumpur, MY\nGreat opportunity')
    expect(result.location).toBe('Kuala Lumpur, MY')
  })

  it('extracts expanded non-tech tags', () => {
    const result = parseJobDescription('Must be proficient in Excel, SQL, Jira and Tableau.')
    expect(result.tags).toEqual(expect.arrayContaining(['Excel', 'SQL', 'Jira', 'Tableau']))
  })

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

  it('reads the role from line 2 and strips a trailing [Location] tag', () => {
    const result = parseJobDescription('Tech Solutions Sdn Bhd\nIT Support Specialist [Kuala Lumpur]\nWe are hiring...')
    expect(result.role).toBe('IT Support Specialist')
  })

  it('recognises a Malaysian city from prose without a label', () => {
    const result = parseJobDescription('Great role at our Petaling Jaya office. Join us!')
    expect(result.location).toBe('Petaling Jaya')
  })

  it('extracts expanded IT-support tags', () => {
    const result = parseJobDescription(
      'Provide Technical Support and Troubleshooting. Familiar with Active Directory, ITIL and Ticketing.',
    )
    expect(result.tags).toEqual(
      expect.arrayContaining(['Technical Support', 'Troubleshooting', 'Active Directory', 'ITIL', 'Ticketing']),
    )
  })

  it('extracts company name using corporate legal suffixes', () => {
    const result = parseJobDescription('Job description for Tech Solutions Sdn Bhd\nWe are looking for...')
    expect(result.company).toBe('Tech Solutions Sdn Bhd')
  })

  it('filters out common noise lines when parsing company name', () => {
    const result = parseJobDescription('Apply Now\nPosted 3 days ago\nStripe\nSenior Engineer')
    expect(result.company).toBe('Stripe')
  })

  it('splits pipeline delimiters to isolate clean role title', () => {
    const result = parseJobDescription('Senior Frontend Developer | Remote | Kuala Lumpur\nJoin us...')
    expect(result.role).toBe('Senior Frontend Developer')
  })

  it('matches product/design roles with seniority level prefixes', () => {
    const result = parseJobDescription('Lead UI/UX Designer\nWe are looking for...')
    expect(result.role).toBe('Lead UI/UX Designer')
  })

  it('correctly extracts Scrum Master or QA role on the second line', () => {
    const result = parseJobDescription('Deloitte\nSenior Scrum Master\nWe are looking for...')
    expect(result.role).toBe('Senior Scrum Master')
  })

  // --- Task 4: Multi-currency salary ---

  it('extracts RM salary range with monthly frequency', () => {
    const result = parseJobDescription('Compensation: RM 5,000 - RM 8,500 / month')
    expect(result.salary_range).toContain('RM')
    expect(result.salary_range).toContain('5,000')
    expect(result.salary_range).toContain('8,500')
  })

  it('extracts SGD salary with k multiplier and per month', () => {
    const result = parseJobDescription('Salary: SGD 6k to 9k per month')
    expect(result.salary_range).toContain('SGD')
    expect(result.salary_range).toContain('6k')
  })

  it('extracts GBP hourly rate', () => {
    const result = parseJobDescription('Offer: £45/hour on contract')
    expect(result.salary_range).toContain('£45')
    expect(result.salary_range).toContain('hour')
  })

  it('still extracts USD salary range (existing behavior)', () => {
    const result = parseJobDescription('Pay: $130k - $160k per year')
    expect(result.salary_range).toContain('130k')
  })

  // --- Task 5: Combined location + work arrangement ---

  it('combines explicit location label with work arrangement found in text', () => {
    const result = parseJobDescription('Office Location: George Town\nThis is a Hybrid role.')
    expect(result.location).toBe('George Town (Hybrid)')
  })

  it('extracts WFH as Remote', () => {
    const result = parseJobDescription('This role is WFH.\nApply now.')
    expect(result.location).toBe('Remote')
  })

  it('combines Malaysian city with work mode', () => {
    const result = parseJobDescription('Great role at our Petaling Jaya office. Hybrid schedule available.')
    expect(result.location).toBe('Petaling Jaya (Hybrid)')
  })
})
