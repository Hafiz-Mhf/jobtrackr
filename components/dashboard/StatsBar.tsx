'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useJobs } from '@/hooks/useJobs'
import { getWeeklyStats } from '@/lib/stats'
import { stagger, fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { StatsBarSkeleton } from '@/components/ui/Skeleton'

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const duration = 600
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      // ease-out quart
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplay(Math.round(eased * value))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value])

  const formatted = display < 10 ? `0${display}` : `${display}`
  return <>{formatted}</>
}

export function StatsBar() {
  const { jobs, loading } = useJobs()
  if (loading) return <StatsBarSkeleton />

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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger(0.08)}
      className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pt-6"
    >
      {tiles.map((tile) => (
        <motion.div
          key={tile.label}
          variants={fadeUp}
          className="relative overflow-hidden bg-surface border border-[var(--color-border)] rounded-xl px-4 py-3 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-1.5">
            <span className={cn('size-1.5 rounded-full', tile.color)} aria-hidden="true" />
            <p className="text-[11px] md:text-xs font-semibold text-brand-muted">
              {tile.label}
            </p>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-lg md:text-xl font-bold text-brand-text">
              <AnimatedNumber value={tile.value} />
            </span>
            <span className={cn('font-mono text-[10px] font-semibold', tile.textColor)}>
              {tile.subtext}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

