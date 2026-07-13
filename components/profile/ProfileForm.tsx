'use client'

import { useState } from 'react'
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
    <form onSubmit={handleSave} className="space-y-6">
      {/* Profile Photo Header block */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar.Root className="size-20 rounded-2xl overflow-hidden bg-accent-light flex items-center justify-center text-accent font-bold text-2xl border border-[var(--color-border)] shadow-md">
            {avatarUrl && <Avatar.Image src={avatarUrl} alt="" className="size-full object-cover" />}
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar.Root>
          <label className="absolute -bottom-2 -right-2 bg-accent hover:bg-accent-hover text-white size-8 rounded-xl flex items-center justify-center shadow-md hover:scale-105 active:scale-[0.95] cursor-pointer transition-all border-2 border-white">
            <Pencil className="size-3.5" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        <div>
          <h3 className="font-bold text-brand-text text-base md:text-lg leading-snug">{fullName || 'User'}</h3>
          <p className="text-xs text-brand-muted flex items-center gap-1.5 mt-1 font-mono">
            <Mail className="size-3.5" />
            {email}
          </p>
          <button
            type="button"
            onClick={() => {
              const inputEl = document.querySelector('input[type="file"]') as HTMLInputElement
              inputEl?.click()
            }}
            disabled={uploading}
            className="text-xs text-accent font-semibold hover:underline mt-2 flex items-center gap-1"
          >
            {uploading ? 'Uploading...' : 'Change photo'}
          </button>
        </div>
      </div>

      {/* Grid for Name & Account type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="profile-name" className="text-xs font-bold uppercase tracking-wider text-brand-text block">
            Display Name
          </label>
          <input
            id="profile-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm bg-surface text-brand-text focus:ring-4 focus:ring-accent/5 focus:border-accent focus:outline-none transition-all"
            placeholder="Display name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-brand-text block">
            Account Type
          </label>
          <div className="w-full border border-[var(--color-border)] bg-surface-muted/50 rounded-xl px-4 py-3 text-sm text-brand-muted flex items-center justify-between cursor-not-allowed">
            <span>Professional</span>
            <Lock className="size-4 text-brand-muted" />
          </div>
        </div>
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

      {error && <p className="text-sm text-[var(--color-rejected)]">{error}</p>}

      {/* Actions */}
      <div className="pt-6 border-t border-[var(--color-border)] flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setFullName(profile.full_name ?? '')}
          disabled={fullName === (profile.full_name ?? '') || saving}
          className="px-5 py-2.5 text-brand-muted hover:text-brand-text font-semibold text-sm hover:bg-surface-muted rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
        >
          Discard changes
        </button>
        <button
          type="submit"
          disabled={fullName === (profile.full_name ?? '') || saving}
          className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:shadow-none"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
