'use client'

import { useJobs } from '@/hooks/useJobs'
import { getWeeklyStats } from '@/lib/stats'

export function StatsBar() {
  const { jobs, loading } = useJobs()
  if (loading) return null

  const stats = getWeeklyStats(jobs)
  const tiles = [
    { label: 'Applied this week', value: stats.appliedThisWeek },
    { label: 'Active interviews', value: stats.activeInterviews },
    { label: 'Offers', value: stats.offers },
    { label: 'Rejected this week', value: stats.rejectedThisWeek },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pt-6">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-surface border border-[var(--color-border)] rounded-lg p-4 shadow-card"
        >
          <p className="text-2xl font-semibold text-brand-text">{tile.value}</p>
          <p className="text-sm text-brand-muted mt-1">{tile.label}</p>
        </div>
      ))}
    </div>
  )
}
