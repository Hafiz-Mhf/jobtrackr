import { describe, it, expect } from 'vitest'
import { getWeeklyStats } from '@/lib/stats'
import type { Job } from '@/types'

function job(overrides: Partial<Job>): Job {
  return {
    id: '1', user_id: 'u', company: 'C', role: 'R', status: 'saved',
    tags: [], last_updated: '2026-07-07T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const now = new Date('2026-07-07T00:00:00Z')

describe('getWeeklyStats', () => {
  it('returns all zeros for an empty list', () => {
    expect(getWeeklyStats([], now)).toEqual({
      appliedThisWeek: 0, activeInterviews: 0, offers: 0, rejectedThisWeek: 0,
    })
  })

  it('counts jobs applied within the last 7 days', () => {
    const jobs = [
      job({ applied_at: '2026-07-05T00:00:00Z' }), // in window
      job({ applied_at: '2026-06-01T00:00:00Z' }), // out of window
      job({ applied_at: undefined }),              // never applied
    ]
    expect(getWeeklyStats(jobs, now).appliedThisWeek).toBe(1)
  })

  it('counts a job applied exactly 7 days ago (inclusive boundary)', () => {
    const jobs = [job({ applied_at: '2026-06-30T00:00:00Z' })]
    expect(getWeeklyStats(jobs, now).appliedThisWeek).toBe(1)
  })

  it('does not count a job applied 8 days ago', () => {
    const jobs = [job({ applied_at: '2026-06-29T00:00:00Z' })]
    expect(getWeeklyStats(jobs, now).appliedThisWeek).toBe(0)
  })

  it('counts live interview and offer columns regardless of date', () => {
    const jobs = [
      job({ status: 'interview' }),
      job({ status: 'interview' }),
      job({ status: 'offer' }),
    ]
    const stats = getWeeklyStats(jobs, now)
    expect(stats.activeInterviews).toBe(2)
    expect(stats.offers).toBe(1)
  })

  it('counts jobs rejected within the last 7 days', () => {
    const jobs = [
      job({ status: 'rejected', rejected_at: '2026-07-06T00:00:00Z' }), // in window
      job({ status: 'rejected', rejected_at: '2026-05-01T00:00:00Z' }), // out of window
    ]
    expect(getWeeklyStats(jobs, now).rejectedThisWeek).toBe(1)
  })
})
