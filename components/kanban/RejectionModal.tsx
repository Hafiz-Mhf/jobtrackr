'use client'

import { useEffect, useRef } from 'react'
import { REJECTION_REASONS } from '@/lib/constants'

interface Props {
  open: boolean
  onSelect: (reason: string) => void
  onSkip: () => void
  onCancel: () => void
}

export function RejectionModal({ open, onSelect, onSkip, onCancel }: Props) {
  const popupRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  // Same treatment as ConfirmDialog: this opens mid-drag on the board, so
  // Escape has to work and focus must not stay behind on the card underneath.
  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement as HTMLElement | null

    const stops = () =>
      Array.from(popupRef.current?.querySelectorAll<HTMLElement>('button') ?? [])

    stops()[0]?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key !== 'Tab') return
      const items = stops()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openerRef.current?.focus?.()
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={popupRef}
        className="w-full max-w-sm bg-surface border border-[var(--color-border)] rounded-lg shadow-card-hover p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rejection-modal-title"
        aria-describedby="rejection-modal-description"
      >
        <h2 id="rejection-modal-title" className="text-base font-semibold text-brand-text">
          Why the rejection?
        </h2>
        <p id="rejection-modal-description" className="text-sm text-brand-muted mt-1">
          Optional — helps you spot patterns later.
        </p>
        <div className="grid gap-2 mt-4">
          {REJECTION_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onSelect(reason)}
              className="w-full min-h-11 text-left border border-[var(--color-border)] rounded-md px-3 text-sm hover:border-accent hover:text-accent transition-colors focus-ring cursor-pointer"
            >
              {reason}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 px-2 rounded-md text-sm text-brand-muted hover:text-brand-text transition-colors focus-ring cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 px-2 rounded-md text-sm font-medium text-accent hover:underline focus-ring cursor-pointer"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
