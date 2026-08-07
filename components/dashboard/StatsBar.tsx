'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useJobs } from '@/hooks/useJobs'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { getWeeklyStats } from '@/lib/stats'
import { stagger, fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { StatsBarSkeleton } from '@/components/ui/Skeleton'

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

  return <span aria-hidden="true">{display}</span>
}

function AnimatedNumber({ value, animate }: { value: number; animate: boolean }) {
  // The count-up is driven by requestAnimationFrame, which the global
  // reduced-motion CSS rule cannot touch — so it has to opt out in JS.
  const shouldAnimate = animate && value !== 0

  // Announce the real figure; the ticking digits in between are decoration.
  return (
    <>
      <span className="sr-only">{value}</span>
      {shouldAnimate ? (
        <CountUp value={value} />
      ) : (
        <span aria-hidden="true">{value}</span>
      )}
    </>
  )
}

export function StatsBar() {
  const { jobs, loading } = useJobs()
  const reducedMotion = usePrefersReducedMotion()
  if (loading) return <StatsBarSkeleton />

  const stats = getWeeklyStats(jobs)
  // Each label states its own time window. Two of these figures are 7-day
  // windows and two are all-time (see lib/stats.ts); when every tile just read
  // "Applied" / "Offers" the only thing separating the two was a secondary line
  // that restated the number it sat beside — so the board's own "APPLIED 12"
  // badge and the tile's "5" looked like a contradiction. The window belongs in
  // the label; the number belongs on its own.
  const tiles = [
    {
      label: 'Applied this week',
      value: stats.appliedThisWeek,
      color: 'bg-[var(--color-applied)]',
    },
    {
      label: 'Active interviews',
      value: stats.activeInterviews,
      color: 'bg-[var(--color-interview)]',
    },
    {
      label: 'Offers',
      value: stats.offers,
      color: 'bg-[var(--color-offer)]',
    },
    {
      label: 'Rejected this week',
      value: stats.rejectedThisWeek,
      color: 'bg-[var(--color-rejected)]',
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
        // No hover shadow: the tile is not a link and lifting on hover promised
        // an action it never had.
        <motion.div
          key={tile.label}
          variants={fadeUp}
          className="relative overflow-hidden bg-surface border border-[var(--color-border)] rounded-xl px-4 py-3 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center gap-1.5">
            <span className={cn('size-1.5 shrink-0 rounded-full', tile.color)} aria-hidden="true" />
            <p className="text-[11px] md:text-xs font-semibold text-brand-muted">
              {tile.label}
            </p>
          </div>
          {/* The figure is the only datum left, so it carries the weight. The
              status colour stays on the dot — as text it fails AA at every one
              of these five steps (see the token notes in CLAUDE.md). */}
          <span className="mt-1.5 text-2xl font-bold leading-none text-brand-text">
            <AnimatedNumber value={tile.value} animate={!reducedMotion} />
          </span>
        </motion.div>
      ))}
    </motion.div>
  )
}

