'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { AlertTriangle, Download, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function DangerZone() {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

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

  async function handleExport() {
    window.location.href = '/api/profile/export'
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-[var(--color-rejected)] shrink-0 animate-pulse" />
        <h3 className="font-bold text-[var(--color-rejected)] text-sm uppercase tracking-wider">
          Danger Zone
        </h3>
      </div>

      <div className="space-y-4">
        {/* Export Data */}
        <div className="bg-surface border border-[var(--color-rejected)]/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[var(--color-rejected)]/30 transition-colors">
          <div className="space-y-1">
            <h4 className="font-bold text-brand-text text-sm md:text-base">Download my data</h4>
            <p className="text-xs text-brand-muted">
              Export your profile and job applications data as a JSON file.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="px-5 py-2 bg-surface hover:bg-surface-muted border border-[var(--color-border)] rounded-xl font-semibold text-sm text-brand-text flex items-center justify-center gap-2 shrink-0 transition-colors"
          >
            <Download className="size-4" />
            Download
          </button>
        </div>

        {/* Delete Account */}
        <AlertDialog.Root>
          <div className="bg-surface border border-[var(--color-rejected)]/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[var(--color-rejected)]/30 transition-colors">
            <div className="space-y-1">
              <h4 className="font-bold text-[var(--color-rejected)] text-sm md:text-base">Delete my account</h4>
              <p className="text-xs text-brand-muted font-medium">
                Permanently deletes your account and all saved data. This cannot be undone.
              </p>
            </div>
            <AlertDialog.Trigger className="px-5 py-2 bg-[var(--color-rejected)] hover:brightness-110 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shrink-0 transition-all active:scale-[0.98] shadow-md shadow-red-500/10">
              <Trash2 className="size-4" />
              Delete account
            </AlertDialog.Trigger>
          </div>

          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" />
            <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 w-[calc(100%-2rem)] max-w-sm space-y-4 border border-[var(--color-border)] shadow-xl z-50 focus:outline-none">
              <AlertDialog.Title className="text-base font-bold text-brand-text flex items-center gap-2">
                <AlertTriangle className="size-5 text-[var(--color-rejected)]" />
                Delete your account?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-brand-muted leading-relaxed">
                This permanently deletes your account and every job you&apos;ve saved. Type{' '}
                <strong className="text-[var(--color-rejected)] select-none">DELETE</strong> to confirm.
              </AlertDialog.Description>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-red-500/5 focus:border-red-500 focus:outline-none transition-all font-mono"
                placeholder="DELETE"
              />
              <div className="flex justify-end gap-2.5 pt-2">
                <AlertDialog.Close className="border border-[var(--color-border)] hover:bg-surface-muted rounded-xl px-4 py-2 text-xs md:text-sm font-semibold text-brand-text transition-colors">
                  Cancel
                </AlertDialog.Close>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE' || deleting}
                  className="bg-[var(--color-rejected)] text-white rounded-xl px-4 py-2 text-xs md:text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98] shadow-md flex items-center gap-1.5"
                >
                  <Trash2 className="size-4" />
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
