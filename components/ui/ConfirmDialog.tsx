'use client'

import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  /** Styles the confirm button as destructive and starts focus on Cancel. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation step for an action that cannot be undone.
 *
 * Focus starts on Cancel for destructive actions so that a stray Enter — or an
 * automated click — dismisses rather than destroys. Escape and a backdrop click
 * both cancel; focus returns to whatever opened the dialog.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    openerRef.current = document.activeElement as HTMLElement | null
    // Destructive actions start on the safe option.
    ;(destructive ? cancelRef : confirmRef).current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      // Keep Tab inside the dialog — only two stops, so this is a simple swap.
      if (e.key === 'Tab') {
        const stops = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[]
        if (stops.length < 2) return
        const first = e.shiftKey ? stops[1] : stops[0]
        const next = document.activeElement === first ? stops[e.shiftKey ? 0 : 1] : first
        e.preventDefault()
        next.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openerRef.current?.focus?.()
    }
  }, [open, destructive, onCancel])

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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-brand-text">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="text-sm text-brand-muted mt-1 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 px-4 rounded-md border border-[var(--color-border)] text-sm font-semibold text-brand-text hover:bg-surface-muted transition-colors focus-ring cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? 'min-h-11 px-4 rounded-md bg-[var(--color-error-text)] text-white text-sm font-semibold hover:opacity-90 transition-opacity focus-ring cursor-pointer'
                : 'min-h-11 px-4 rounded-md bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors focus-ring cursor-pointer'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
