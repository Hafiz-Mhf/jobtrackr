import { describe, it, expect } from 'vitest'
import { getStaleDays, getStaleJobs, getStaleThreshold, isStale } from '@/lib/reminders'
import type { Job } from '@/types'

function job(overrides: Partial<Job>): Job {
  return {
    id: '1', user_id: 'u', company: 'C', role: 'R', status: 'applied',
    tags: [], last_updated: '2026-07-07T00:00:00Z', status_changed_at: '2026-07-07T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const now = new Date('2026-07-07T00:00:00Z')

describe('getStaleJobs', () => {
  it('flags an applied job whose applied_at is older than 7 days', () => {
    const stale = job({ applied_at: '2026-06-01T00:00:00Z', last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleJobs([stale], now)).toHaveLength(1)
  })

  it('measures an applied job from applied_at even when last_updated is recent', () => {
    // Edited yesterday, but applied 3 weeks ago → still stale.
    const stale = job({ applied_at: '2026-06-15T00:00:00Z', last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleJobs([stale], now)).toHaveLength(1)
  })

  it('falls back to last_updated when applied_at is missing', () => {
    const fresh = job({ applied_at: undefined, last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleJobs([fresh], now)).toHaveLength(0)
  })

  it('does not flag an applied job within the 7-day window', () => {
    const fresh = job({ applied_at: '2026-07-05T00:00:00Z' })
    expect(getStaleJobs([fresh], now)).toHaveLength(0)
  })
})

describe('per-status thresholds', () => {
  it('never flags a saved job — a bookmark has nobody on the other side', () => {
    const saved = job({ status: 'saved', applied_at: '2026-01-01T00:00:00Z', last_updated: '2026-01-01T00:00:00Z' })
    expect(getStaleThreshold(saved)).toBeNull()
    expect(getStaleJobs([saved], now)).toHaveLength(0)
  })

  it('never flags a rejected job — the stage is terminal', () => {
    const rejected = job({ status: 'rejected', last_updated: '2026-01-01T00:00:00Z' })
    expect(getStaleThreshold(rejected)).toBeNull()
    expect(getStaleJobs([rejected], now)).toHaveLength(0)
  })

  it('gives an interview 14 days, not 7', () => {
    const tenDays = job({ status: 'interview', status_changed_at: '2026-06-27T00:00:00Z' })
    const twentyDays = job({ status: 'interview', status_changed_at: '2026-06-17T00:00:00Z' })
    expect(isStale(tenDays, now)).toBe(false)
    expect(isStale(twentyDays, now)).toBe(true)
  })

  it('flags an open offer after 7 days', () => {
    const eightDays = job({ status: 'offer', status_changed_at: '2026-06-29T00:00:00Z' })
    expect(isStale(eightDays, now)).toBe(true)
  })

  it('measures a non-applied job from status_changed_at, not applied_at', () => {
    // Applied in January, but the interview was scheduled yesterday. Reading
    // applied_at here would report it as six months silent.
    const freshInterview = job({
      status: 'interview',
      applied_at: '2026-01-05T00:00:00Z',
      status_changed_at: '2026-07-06T00:00:00Z',
    })
    expect(getStaleDays(freshInterview, now)).toBe(1)
    expect(isStale(freshInterview, now)).toBe(false)
  })

  // The reason status_changed_at exists rather than reusing last_updated: any
  // edit touches last_updated, so an interview that has genuinely been silent
  // for a month stopped being flagged the moment its notes were edited.
  it('keeps flagging a silent interview after an unrelated edit', () => {
    const editedYesterday = job({
      status: 'interview',
      status_changed_at: '2026-06-01T00:00:00Z',
      last_updated: '2026-07-06T00:00:00Z',
    })
    expect(getStaleDays(editedYesterday, now)).toBe(36)
    expect(isStale(editedYesterday, now)).toBe(true)
  })
})

describe('getStaleDays', () => {
  // The regression this exists for: the reminders badge counted from
  // last_updated while getStaleJobs filtered on applied_at, so an unrelated
  // edit made a long-silent job report "No update in 1 days".
  it('counts an applied job from applied_at even when last_updated is recent', () => {
    const stale = job({ applied_at: '2026-06-15T00:00:00Z', last_updated: '2026-07-06T00:00:00Z' })
    expect(getStaleDays(stale, now)).toBe(22)
  })

  it('falls back to last_updated when applied_at is missing', () => {
    const j = job({ applied_at: undefined, last_updated: '2026-06-30T00:00:00Z' })
    expect(getStaleDays(j, now)).toBe(7)
  })

  it('reports 0 on the day the clock starts', () => {
    const j = job({ applied_at: '2026-07-07T00:00:00Z' })
    expect(getStaleDays(j, now)).toBe(0)
  })

  it('agrees with isStale about what counts as stale, per status', () => {
    const applied = job({ applied_at: '2026-06-15T00:00:00Z', last_updated: '2026-07-06T00:00:00Z' })
    expect(isStale(applied, now)).toBe(true)
    expect(getStaleDays(applied, now)).toBeGreaterThan(7)

    // 10 days is past the applied threshold but inside the interview one — the
    // day count alone is not enough to decide, which is the point of isStale.
    const interview = job({ status: 'interview', status_changed_at: '2026-06-27T00:00:00Z' })
    expect(getStaleDays(interview, now)).toBe(10)
    expect(isStale(interview, now)).toBe(false)
  })
})
