'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  const supabase = createClient()

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    if (mode === 'sign-up') {
      if (!consentChecked) {
        setLoading(false)
        setError('Please agree to the Privacy Policy to create an account.')
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/callback` },
      })
      setLoading(false)
      if (error) {
        setError('Could not create account. Try a different email or password.')
        return
      }
      setInfo('Check your email to confirm your account before signing in.')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Invalid email or password.')
      return
    }
    window.location.href = '/dashboard'
  }

  async function handleGoogleAuth() {
    setError(null)
    setInfo(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/callback` },
    })
    setLoading(false)

    if (error) {
      setError('Could not connect to Google. Try again.')
      return
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm bg-surface border border-[var(--color-border)] rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-brand-text mb-1">
          Your job search, actually organized.
        </h1>
        <p className="text-sm text-brand-muted mb-6">
          {mode === 'sign-in' ? 'Sign in to continue' : 'Create your account'}
        </p>

        <button
          type="button"
          onClick={handleGoogleAuth}
          className="w-full border border-[var(--color-border)] rounded-md py-2 text-sm font-medium mb-4"
        >
          Continue with Google
        </button>
        <p className="text-xs text-brand-muted text-center mb-4">
          By continuing you agree to our{' '}
          <a href="/privacy" target="_blank" className="text-accent underline">
            Privacy Policy
          </a>
          .
        </p>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm"
          />
          {mode === 'sign-up' && (
            <label className="flex items-start gap-2 text-xs text-brand-muted">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I agree to the{' '}
                <a href="/privacy" target="_blank" className="text-accent underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          )}
          {error && <p className="text-sm text-[var(--color-rejected)]">{error}</p>}
          {info && <p className="text-sm text-[var(--color-offer)]">{info}</p>}
          <button
            type="submit"
            disabled={loading || (mode === 'sign-up' && !consentChecked)}
            className="w-full bg-accent text-white rounded-md py-2 text-sm font-semibold disabled:opacity-60"
          >
            {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          className="w-full text-center text-sm text-brand-muted mt-4"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  )
}
