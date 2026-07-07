'use client'

import { REJECTION_REASONS } from '@/lib/constants'

interface Props {
  open: boolean
  onSelect: (reason: string) => void
  onSkip: () => void
  onCancel: () => void
}

export function RejectionModal({ open, onSelect, onSkip, onCancel }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm bg-surface border border-[var(--color-border)] rounded-lg shadow-card-hover p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Rejection reason"
      >
        <h2 className="text-base font-semibold text-brand-text">Why the rejection?</h2>
        <p className="text-sm text-brand-muted mt-1">Optional — helps you spot patterns later.</p>
        <div className="grid gap-2 mt-4">
          {REJECTION_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onSelect(reason)}
              className="w-full text-left border border-[var(--color-border)] rounded-md px-3 py-2 text-sm hover:border-accent hover:text-accent transition-colors"
            >
              {reason}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-brand-muted hover:text-brand-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-accent hover:underline"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
