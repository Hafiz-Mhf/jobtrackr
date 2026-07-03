'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertDialog } from '@base-ui/react/alert-dialog'
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
    <div className="max-w-md border border-[var(--color-rejected)]/30 rounded-lg p-4 space-y-4">
      <h2 className="text-sm font-semibold text-[var(--color-rejected)] uppercase tracking-wide">
        Danger zone
      </h2>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-brand-text">Download my data</p>
          <p className="text-xs text-brand-muted">Export your profile and job data as JSON.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm font-medium"
        >
          Download
        </button>
      </div>

      <AlertDialog.Root>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-text">Delete my account</p>
            <p className="text-xs text-brand-muted">
              Permanently deletes your account and all your job data.
            </p>
          </div>
          <AlertDialog.Trigger className="bg-[var(--color-rejected)] text-white rounded-md px-3 py-1.5 text-sm font-medium">
            Delete account
          </AlertDialog.Trigger>
        </div>

        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-xl p-6 w-full max-w-sm space-y-4">
            <AlertDialog.Title className="text-base font-semibold text-brand-text">
              Delete your account?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-brand-muted">
              This permanently deletes your account and every job you&apos;ve saved. This
              cannot be undone. Type <strong>DELETE</strong> to confirm.
            </AlertDialog.Description>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm"
              placeholder="DELETE"
            />
            <div className="flex justify-end gap-2">
              <AlertDialog.Close className="border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm font-medium">
                Cancel
              </AlertDialog.Close>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                className="bg-[var(--color-rejected)] text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
