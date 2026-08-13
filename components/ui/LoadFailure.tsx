'use client'

import { RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** What failed, in the user's terms — "Your board didn't load". */
  title: string
  /** The message from the failed load. */
  message: string
  onRetry: () => void
  /**
   * A page whose whole content failed owns the h1; a panel failing inside a
   * page that still renders its own heading uses h2.
   */
  as?: 'h1' | 'h2'
  className?: string
}

/**
 * The shared "this didn't load, try again" state.
 *
 * Every surface that reads from JobsProvider needs one, and each had grown its
 * own copy — which is how the reminders page ended up with none at all and
 * showed "No stale applications — nice work staying on top of things" whenever
 * the fetch failed, telling the user their pipeline was clear when it was
 * simply unknown.
 */
export function LoadFailure({ title, message, onRetry, as = 'h2', className }: Props) {
  const Heading = as

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6 bg-surface border border-[var(--color-border)] rounded-2xl shadow-card',
        className,
      )}
    >
      <Heading className="text-lg font-bold text-brand-text mb-1.5">{title}</Heading>
      <p className="text-sm text-brand-muted max-w-sm leading-relaxed mb-5">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-11 items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-5 text-sm font-semibold shadow-md transition-colors focus-ring cursor-pointer"
      >
        <RotateCw className="size-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}
