'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@base-ui/react/avatar'
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
    <form onSubmit={handleSave} className="space-y-6 max-w-md">
      <div className="flex items-center gap-4">
        <Avatar.Root className="size-16 rounded-full overflow-hidden bg-accent-light flex items-center justify-center text-accent font-semibold text-xl">
          {avatarUrl && <Avatar.Image src={avatarUrl} alt="" className="size-full object-cover" />}
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar.Root>
        <label className="text-sm font-medium text-accent cursor-pointer">
          {uploading ? 'Uploading…' : 'Change photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-name" className="text-sm font-medium text-brand-text">Name</label>
        <input
          id="profile-name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-email" className="text-sm font-medium text-brand-text">Email</label>
        <input
          id="profile-email"
          type="email"
          value={email}
          disabled
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-surface-muted text-brand-muted"
        />
        <p className="text-xs text-brand-muted">Managed via your sign-in method.</p>
      </div>

      {error && <p className="text-sm text-[var(--color-rejected)]">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-accent text-white rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
