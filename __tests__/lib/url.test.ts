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
