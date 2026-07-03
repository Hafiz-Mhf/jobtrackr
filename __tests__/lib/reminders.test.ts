import { describe, it, expect } from 'vitest'
import { getStaleJobs } from '@/lib/reminders'
import type { Job } from '@/types'

function makeJob(overrides: Partial<Job>): Job {
  return {
    id: '1',
    user_id: 'u1',
    company: 'Acme',
    role: 'Engineer',
    status: 'applied',
    tags: [],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('getStaleJobs', () => {
  const now = new Date('2026-07-03T00:00:00Z')

  it('flags an applied job with no update in 7+ days', () => {
    const job = makeJob({ status: 'applied', last_updated: '2026-06-25T00:00:00Z' })
    expect(getStaleJobs([job], now)).toEqual([job])
  })

  it('does not flag an applied job updated within 7 days', () => {
    const job = makeJob({ status: 'applied', last_updated: '2026-06-28T00:00:00Z' })
    expect(getStaleJobs([job], now)).toEqual([])
  })

  it('does not flag a non-applied job regardless of age', () => {
    const job = makeJob({ status: 'saved', last_updated: '2026-06-01T00:00:00Z' })
    expect(getStaleJobs([job], now)).toEqual([])
  })

  it('does not flag exactly at the 7-day boundary', () => {
    const job = makeJob({ status: 'applied', last_updated: '2026-06-26T00:00:00Z' })
    expect(getStaleJobs([job], now)).toEqual([])
  })

  it('flags just past the 7-day boundary', () => {
    const job = makeJob({ status: 'applied', last_updated: '2026-06-25T23:59:59Z' })
    expect(getStaleJobs([job], now)).toEqual([job])
  })
})
