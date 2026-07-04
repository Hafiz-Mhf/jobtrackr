'use client'

import { useState } from 'react'
import { Eye, EyeOff, LayoutGrid, FileText, BellRing } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const BENEFITS = [
  {
    icon: FileText,
    title: 'Paste a job post, done',
    description: 'We pull out the company, role, and tech stack automatically.',
  },
  {
    icon: LayoutGrid,
    title: 'One board, every stage',
    description: 'Drag applications from Saved to Offer without losing track.',
  },
  {
    icon: BellRing,
    title: 'Never ghost a follow-up',
    description: 'We flag anything quiet for 7+ days.',
  },
]

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.27a12 12 0 0 0 0 10.8l4-3.11Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.6l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <main className="min-h-dvh flex bg-brand-bg">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-accent text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_15%_20%,white_0,transparent_40%),radial-gradient(circle_at_85%_80%,white_0,transparent_45%)]"
          aria-hidden="true"
        />
        <div className="relative">
          <span className="text-lg font-semibold">JobTrackr</span>
        </div>

        <div className="relative flex-1 flex flex-col justify-center space-y-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">
            Stop losing track of your applications.
          </h1>
          <div className="space-y-6">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="shrink-0 size-10 rounded-lg bg-white/15 flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/80">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-white/70">
          Free, no ads, no AI subscription required.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <span className="text-lg font-semibold text-accent">JobTrackr</span>
          </div>

          <h2 className="text-2xl font-semibold text-brand-text mb-1">
            {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-brand-muted mb-6">
            {mode === 'sign-in'
              ? 'Sign in to pick up where you left off.'
              : 'Takes less than a minute — no credit card, ever.'}
          </p>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-[var(--color-border)] rounded-md py-2.5 text-sm font-medium hover:bg-surface-muted transition-colors disabled:opacity-60 cursor-pointer"
          >
            <GoogleLogo />
            Continue with Google
          </button>
          <p className="text-xs text-brand-muted text-center mt-3 mb-5">
            By continuing you agree to our{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">
              Privacy Policy
            </a>
            .
          </p>

          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-xs text-brand-muted">or continue with email</span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-brand-text">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-brand-text">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

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
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            )}

            {error && (
              <p role="alert" className="text-sm text-[var(--color-rejected)]">
                {error}
              </p>
            )}
            {info && <p className="text-sm text-[var(--color-offer)]">{info}</p>}

            <button
              type="submit"
              disabled={loading || (mode === 'sign-up' && !consentChecked)}
              className="w-full bg-accent text-white rounded-md py-2.5 text-sm font-semibold hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            className="w-full text-center text-sm text-brand-muted mt-5 cursor-pointer"
          >
            {mode === 'sign-in' ? (
              <>Don&apos;t have an account? <span className="text-accent font-medium">Sign up</span></>
            ) : (
              <>Already have an account? <span className="text-accent font-medium">Sign in</span></>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
