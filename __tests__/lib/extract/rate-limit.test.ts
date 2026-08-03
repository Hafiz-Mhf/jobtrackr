import { describe, it, expect } from 'vitest'
import { checkRateLimit, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from '@/lib/extract/rate-limit'

describe('checkRateLimit', () => {
  it('allows requests up to the limit', () => {
    const now = 1_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(checkRateLimit('user-allow', now)).toBe(true)
    }
  })

  it('rejects the request past the limit', () => {
    const now = 2_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit('user-reject', now)
    expect(checkRateLimit('user-reject', now)).toBe(false)
  })

  it('allows again once the window has passed', () => {
    const now = 3_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit('user-window', now)
    expect(checkRateLimit('user-window', now)).toBe(false)
    expect(checkRateLimit('user-window', now + RATE_LIMIT_WINDOW_MS + 1)).toBe(true)
  })

  it('tracks each user separately', () => {
    const now = 4_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit('user-a', now)
    expect(checkRateLimit('user-a', now)).toBe(false)
    expect(checkRateLimit('user-b', now)).toBe(true)
  })
})
