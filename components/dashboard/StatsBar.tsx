'use client'

import { useJobs } from '@/hooks/useJobs'
import { getWeeklyStats } from '@/lib/stats'
import { cn } from '@/lib/utils'

export function StatsBar() {
  const { jobs, loading } = useJobs()
  if (loading) return null

  const stats = getWeeklyStats(jobs)
  const tiles = [
    {
      label: 'Applied',
      value: stats.appliedThisWeek,
      subtext: `+${stats.appliedThisWeek} this wk`,
      color: 'bg-[var(--color-applied)]',
      textColor: 'text-[var(--color-applied)]',
    },
    {
      label: 'Interviews',
      value: stats.activeInterviews,
      subtext: `${stats.activeInterviews} active`,
      color: 'bg-[var(--color-interview)]',
      textColor: 'text-[var(--color-interview)]',
    },
    {
      label: 'Offers',
      value: stats.offers,
      subtext: `${stats.offers} total`,
      color: 'bg-[var(--color-offer)]',
      textColor: 'text-[var(--color-offer)]',
    },
    {
      label: 'Rejected',
      value: stats.rejectedThisWeek,
      subtext: `${stats.rejectedThisWeek} this wk`,
      color: 'bg-[var(--color-rejected)]',
      textColor: 'text-brand-muted',
    },
  ]

  // Formatted value helper (adds leading zero if < 10)
  const formatVal = (v: number) => (v < 10 ? `0${v}` : `${v}`)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pt-6">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="relative overflow-hidden bg-surface border border-[var(--color-border)] rounded-xl px-4 py-3 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className={cn('absolute top-0 left-0 w-full h-1', tile.color)} />
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-brand-muted">
            {tile.label}
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg md:text-xl font-bold text-brand-text">
              {formatVal(tile.value)}
            </span>
            <span className={cn('font-mono text-[10px] font-semibold', tile.textColor)}>
              {tile.subtext}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
