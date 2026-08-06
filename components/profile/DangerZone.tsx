'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { AlertTriangle, Download, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CONFIRM_WORD = 'DELETE'

export function DangerZone() {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Clearing on every open/close is the whole point: confirmText lives out here
  // so the dialog can read it, which meant typing DELETE, cancelling, and
  // reopening left the button already armed — the typed confirmation only
  // guarded the first attempt.
  function handleOpenChange(next: boolean) {
    setOpen(next)
    setConfirmText('')
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/profile', { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Your account has been deleted.')
      window.location.href = '/login'
    } catch {
      toast.error("Couldn't delete account. Try again.")
      setDeleting(false)
    }
  }

  // Fetched rather than a window.location jump so a failed export can actually
  // be reported — the old handler navigated away and showed nothing on error.
  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/profile/export')
      if (!res.ok) throw new Error('Export failed.')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'jobtrackr-export.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Your data has been downloaded.')
    } catch {
      toast.error("Couldn't export your data. Try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-[var(--color-error-text)] shrink-0" aria-hidden="true" />
        <h2 className="font-bold text-[var(--color-error-text)] text-sm uppercase tracking-wider">
          Danger Zone
        </h2>
      </div>

      {/* Rows divided by rules, not boxes: these sit inside the Danger Zone
          card already, and bordering each one nested a card in a card. */}
      <div className="divide-y divide-[var(--color-error-text)]/10">
        {/* Export Data */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
          <div className="space-y-1">
            <h3 className="font-bold text-brand-text text-sm md:text-base">Download my data</h3>
            <p className="text-xs text-brand-muted">
              Export your profile and job applications data as a JSON file.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="min-h-11 px-5 bg-surface hover:bg-surface-muted border border-[var(--color-border)] rounded-xl font-semibold text-sm text-brand-text flex items-center justify-center gap-2 shrink-0 transition-colors focus-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="size-4" aria-hidden="true" />
            {exporting ? 'Preparing…' : 'Download'}
          </button>
        </div>

        {/* Delete Account */}
        <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5">
            <div className="space-y-1">
              <h3 className="font-bold text-[var(--color-error-text)] text-sm md:text-base">
                Delete my account
              </h3>
              <p className="text-xs text-brand-muted font-medium">
                Permanently deletes your account and all saved data. This cannot be undone.
              </p>
            </div>
            <AlertDialog.Trigger className="min-h-11 px-5 bg-[var(--color-error-text)] hover:brightness-110 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shrink-0 transition-all active:scale-[0.98] shadow-md focus-ring cursor-pointer">
              <Trash2 className="size-4" aria-hidden="true" />
              Delete account
            </AlertDialog.Trigger>
          </div>

          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" />
            <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 w-[calc(100%-2rem)] max-w-sm space-y-4 border border-[var(--color-border)] shadow-xl z-50 focus:outline-none">
              <AlertDialog.Title className="text-base font-bold text-brand-text flex items-center gap-2">
                <AlertTriangle className="size-5 text-[var(--color-error-text)]" aria-hidden="true" />
                Delete your account?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-brand-muted leading-relaxed">
                This permanently deletes your account and every job you&apos;ve saved. Type{' '}
                <strong className="text-[var(--color-error-text)] select-none">{CONFIRM_WORD}</strong>{' '}
                to confirm.
              </AlertDialog.Description>
              <label htmlFor="delete-confirm" className="sr-only">
                Type {CONFIRM_WORD} to confirm account deletion
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="w-full min-h-11 border border-[var(--color-border)] rounded-xl px-4 text-sm focus:border-[var(--color-error-text)] focus-ring transition-colors font-mono"
                placeholder={CONFIRM_WORD}
              />
              <div className="flex justify-end gap-2.5 pt-2">
                <AlertDialog.Close className="min-h-11 border border-[var(--color-border)] hover:bg-surface-muted rounded-xl px-4 text-xs md:text-sm font-semibold text-brand-text transition-colors focus-ring cursor-pointer">
                  Cancel
                </AlertDialog.Close>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={confirmText !== CONFIRM_WORD || deleting}
                  className="min-h-11 bg-[var(--color-error-text)] text-white rounded-xl px-4 text-xs md:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-md flex items-center gap-1.5 focus-ring cursor-pointer"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {deleting ? 'Deleting…' : 'Permanently delete'}
                </button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  )
}
