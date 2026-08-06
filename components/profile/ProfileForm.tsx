'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@base-ui/react/avatar'
import { Pencil, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { validateFullName, validateAvatarFile } from '@/lib/validation'
import { getAvatarPath, AVATAR_BUCKET } from '@/lib/avatar'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
  email: string
}

export function ProfileForm({ profile, email }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // "Change photo" used to reach for document.querySelector('input[type=file]'),
  // which grabs the first file input on the page — not necessarily this one.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const fileError = validateAvatarFile(file)
    if (fileError) {
      setError(fileError)
      return
    }

    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')

      const path = getAvatarPath(user.id, file.type)
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      const bustedUrl = `${publicUrl}?t=${Date.now()}`

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: bustedUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setAvatarUrl(bustedUrl)
      toast.success('Photo updated.')
    } catch {
      setError("Couldn't upload photo. Try again.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const nameError = validateFullName(fullName)
    if (nameError) {
      setError(nameError)
      nameInputRef.current?.focus()
      return
    }

    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Profile updated.')
    } catch {
      setError("Couldn't save changes. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const initials = (fullName || email).slice(0, 1).toUpperCase()

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Profile Photo Header block */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar.Root className="size-20 rounded-2xl overflow-hidden bg-accent-light flex items-center justify-center text-accent font-bold text-2xl border border-[var(--color-border)] shadow-md">
            {avatarUrl && <Avatar.Image src={avatarUrl} alt="" className="size-full object-cover" />}
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar.Root>
          <label
            htmlFor="avatar-upload"
            className="absolute -bottom-2 -right-2 bg-accent hover:bg-accent-hover text-white size-8 rounded-xl flex items-center justify-center shadow-md hover:scale-105 active:scale-[0.95] cursor-pointer transition-all border-2 border-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-accent)]"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Upload a profile photo</span>
            <input
              id="avatar-upload"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              disabled={uploading}
              className="sr-only"
            />
          </label>
        </div>
        <div>
          <h2 className="font-bold text-brand-text text-base md:text-lg leading-snug">{fullName || 'User'}</h2>
          <p className="text-xs text-brand-muted flex items-center gap-1.5 mt-1 font-mono">
            <Mail className="size-3.5" />
            {email}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="min-h-11 text-xs text-accent font-semibold hover:underline mt-1 flex items-center gap-1 focus-ring rounded-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
        </div>
      </div>

      {/* "Account Type: Professional" used to sit beside this field. JobTrackr
          has no account tiers — it was a padlocked label for a plan that
          doesn't exist. */}
      <div className="space-y-2">
        <label htmlFor="profile-name" className="text-xs font-bold uppercase tracking-wider text-brand-text block">
          Display Name
        </label>
        <input
          id="profile-name"
          ref={nameInputRef}
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'profile-error' : undefined}
          className="w-full min-h-11 border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm bg-surface text-brand-text focus:border-accent focus-ring transition-colors"
          placeholder="Display name"
        />
      </div>

      {/* Readonly email address */}
      <div className="space-y-2">
        <label htmlFor="profile-email" className="text-xs font-bold uppercase tracking-wider text-brand-text block">
          Email Address
        </label>
        <input
          id="profile-email"
          type="email"
          value={email}
          disabled
          className="w-full border border-[var(--color-border)] bg-surface-muted/50 rounded-xl px-4 py-3 text-sm text-brand-muted cursor-not-allowed"
        />
        <div className="flex items-center gap-1.5 mt-2 px-1 text-[10px] md:text-xs text-brand-muted">
          <Lock className="size-3.5 text-accent" />
          <span>Managed via your authentication sign-in method.</span>
        </div>
      </div>

      {error && (
        <p id="profile-error" role="alert" className="text-sm text-[var(--color-error-text)]">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="pt-6 border-t border-[var(--color-border)] flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setFullName(profile.full_name ?? '')
            setError(null)
          }}
          disabled={fullName === (profile.full_name ?? '') || saving}
          className="min-h-11 px-5 text-brand-muted hover:text-brand-text font-semibold text-sm hover:bg-surface-muted rounded-xl transition-colors focus-ring cursor-pointer disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          Discard changes
        </button>
        <button
          type="submit"
          disabled={fullName === (profile.full_name ?? '') || saving}
          className="min-h-11 px-6 bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98] transition-all focus-ring cursor-pointer disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
