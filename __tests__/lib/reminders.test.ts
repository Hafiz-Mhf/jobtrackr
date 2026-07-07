import { describe, it, expect } from 'vitest'
import { getStaleJobs } from '@/lib/reminders'
import type { Job } from '@/types'

function job(overrides: Partial<Job>): Job {
  return {
    id: '1', user_id: 'u', company: 'C', role: 'R', status: 'applied',
    tags: [], last_updated: '2026-07-07T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const now = new Date('2026-07-07T00:00:00Z')

describe('getStaleJobs', () => {
  it('flags an applied job whose applied_at is older than 7 days', () => {
    const stale = job({ applied_at: '2026-06-01T00:00:00Z', last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleJobs([stale], now)).toHaveLength(1)
  })

  it('measures from applied_at even when last_updated is recent', () => {
    // Edited yesterday, but applied 3 weeks ago → still stale.
    const stale = job({ applied_at: '2026-06-15T00:00:00Z', last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleJobs([stale], now)).toHaveLength(1)
  })

  it('falls back to last_updated when applied_at is missing', () => {
    const fresh = job({ applied_at: undefined, last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleJobs([fresh], now)).toHaveLength(0)
  })

  it('ignores non-applied jobs', () => {
    const saved = job({ status: 'saved', applied_at: '2026-01-01T00:00:00Z' })
    expect(getStaleJobs([saved], now)).toHaveLength(0)
  })

  it('does not flag an applied job within the 7-day window', () => {
    const fresh = job({ applied_at: '2026-07-05T00:00:00Z' })
    expect(getStaleJobs([fresh], now)).toHaveLength(0)
  })
})
