export const RATE_LIMIT_WINDOW_MS = 60_000
export const RATE_LIMIT_MAX = 10

const MAX_TRACKED_USERS = 1000

const hits = new Map<string, number[]>()

// In-memory and per-instance: this resets on cold start, so on serverless it is
// a speed bump against casual abuse rather than a real quota. Redis is the
// upgrade path if abuse actually shows up.
export function checkRateLimit(userId: string, now: number = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((at) => now - at < RATE_LIMIT_WINDOW_MS)

  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(userId, recent)
    return false
  }

  recent.push(now)
  hits.set(userId, recent)

  if (hits.size > MAX_TRACKED_USERS) {
    for (const [key, times] of hits) {
      if (times.every((at) => now - at >= RATE_LIMIT_WINDOW_MS)) hits.delete(key)
    }
  }

  return true
}
