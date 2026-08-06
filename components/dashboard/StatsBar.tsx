'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useJobs } from '@/hooks/useJobs'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { getWeeklyStats } from '@/lib/stats'
import { stagger, fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { StatsBarSkeleton } from '@/components/ui/Skeleton'

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

// Only mounted when the count-up should actually run, so the effect never has
// to setState synchronously just to fall back to the static figure.
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
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

  return <span aria-hidden="true">{pad(display)}</span>
}

function AnimatedNumber({ value, animate }: { value: number; animate: boolean }) {
  // The count-up is driven by requestAnimationFrame, which the global
  // reduced-motion CSS rule cannot touch — so it has to opt out in JS.
  const shouldAnimate = animate && value !== 0

  // Announce the real figure; the ticking digits in between are decoration.
  return (
    <>
      <span className="sr-only">{pad(value)}</span>
      {shouldAnimate ? (
        <CountUp value={value} />
      ) : (
        <span aria-hidden="true">{pad(value)}</span>
      )}
    </>
  )
}

export function StatsBar() {
  const { jobs, loading } = useJobs()
  const reducedMotion = usePrefersReducedMotion()
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
      textColor: 'text-[var(--color-rejected)]',
    },
  ]

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
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
              <AnimatedNumber value={tile.value} animate={!reducedMotion} />
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

