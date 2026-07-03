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
})
