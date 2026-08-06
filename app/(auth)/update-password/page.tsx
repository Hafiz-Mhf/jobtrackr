'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MIN_PASSWORD_LENGTH = 8

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // null = still checking. The recovery link exchanges a code for a session in
  // /callback, so landing here without one means the link was stale or reused.
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setHasSession(Boolean(data.session))
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Both passwords must match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError("Couldn't update your password. Request a new reset link and try again.")
      return
    }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[360px] space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white">
            <Briefcase className="size-4.5" aria-hidden="true" />
          </div>
          <span className="font-bold text-brand-text text-lg">JobTrackr</span>
        </div>

        <header className="space-y-1">
          <h1 className="font-extrabold text-brand-text text-2xl md:text-3xl tracking-tight">
            Choose a new password
          </h1>
          <p className="text-xs md:text-sm text-brand-muted leading-relaxed">
            Pick something at least {MIN_PASSWORD_LENGTH} characters long. You&apos;ll be signed in
            once it&apos;s saved.
          </p>
        </header>

        {hasSession === false && (
          <div className="rounded-xl bg-[var(--color-warning-bg)] p-4 text-xs md:text-sm text-[var(--color-warning-text)] leading-relaxed">
            This reset link has expired or has already been used.{' '}
            <Link href="/login" className="underline font-semibold focus-ring rounded-sm">
              Request a new one
            </Link>
            .
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-sm font-semibold text-brand-text">
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-brand-muted" aria-hidden="true" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'update-password-error' : undefined}
                placeholder="••••••••"
                className="w-full min-h-11 border border-[var(--color-border)] rounded-xl pl-10 pr-12 py-2.5 text-sm bg-surface text-brand-text focus:border-accent focus-ring transition-colors placeholder:text-brand-muted font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-text cursor-pointer focus-ring"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-sm font-semibold text-brand-text">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-11 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm bg-surface text-brand-text focus:border-accent focus-ring transition-colors placeholder:text-brand-muted font-mono"
            />
          </div>

          {error && (
            <p id="update-password-error" role="alert" className="text-xs md:text-sm text-[var(--color-error-text)] font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || hasSession === false}
            className="w-full min-h-11 py-3 px-4 bg-accent hover:bg-accent-hover text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed cursor-pointer focus-ring"
          >
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </main>
  )
}
