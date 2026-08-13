import { describe, expect, it } from 'vitest'
import { restoreJob, revertJob } from '@/lib/jobs-state'
import type { Job } from '@/types'

function job(id: string, overrides: Partial<Job> = {}): Job {
  return {
    id,
    user_id: 'user-1',
    company: `Company ${id}`,
    role: 'Engineer',
    status: 'saved',
    tags: [],
    status_changed_at: '2026-08-01T00:00:00.000Z',
    last_updated: '2026-08-01T00:00:00.000Z',
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('revertJob', () => {
  it('restores the failed row to how it stood before the request', () => {
    const before = job('a', { status: 'saved' })
    const optimistic = [job('a', { status: 'interview' }), job('b')]

    expect(revertJob(optimistic, before)).toEqual([before, job('b')])
  })

  it('leaves other rows untouched, including ones changed while the request was in flight', () => {
    const beforeA = job('a', { status: 'saved' })
    // B was moved and server-confirmed while A's PATCH was still open. A whole
    // array snapshot taken before A's own change predates this, so reverting to
    // it would silently undo B.
    const confirmedB = job('b', { status: 'offer', status_changed_at: '2026-08-13T00:00:00.000Z' })
    const optimistic = [job('a', { status: 'interview' }), confirmedB]

    expect(revertJob(optimistic, beforeA)).toEqual([beforeA, confirmedB])
  })

  it('returns the list unchanged when the row is no longer present', () => {
    const before = job('a')
    const list = [job('b')]

    expect(revertJob(list, before)).toEqual(list)
  })

  it('returns the list unchanged when there was nothing to revert to', () => {
    const list = [job('a'), job('b')]

    expect(revertJob(list, undefined)).toEqual(list)
  })
})

describe('restoreJob', () => {
  it('puts a failed delete back where it was', () => {
    const removed = job('b')
    const list = [job('a'), job('c')]

    expect(restoreJob(list, removed, 1)).toEqual([job('a'), removed, job('c')])
  })

  it('keeps rows added while the delete was in flight', () => {
    const removed = job('b')
    const added = job('new')
    const list = [added, job('a'), job('c')]

    expect(restoreJob(list, removed, 1)).toEqual([added, removed, job('a'), job('c')])
  })

  it('appends when the original index no longer exists', () => {
    const removed = job('b')
    const list = [job('a')]

    expect(restoreJob(list, removed, 5)).toEqual([job('a'), removed])
  })

  it('does not duplicate a row that is already back in the list', () => {
    const removed = job('b')
    const list = [job('a'), removed]

    expect(restoreJob(list, removed, 1)).toEqual(list)
  })

  it('returns the list unchanged when there is nothing to restore', () => {
    const list = [job('a')]

    expect(restoreJob(list, undefined, 0)).toEqual(list)
  })
})
