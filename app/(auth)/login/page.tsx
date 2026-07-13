'use client'

import { useState } from 'react'
import { Eye, EyeOff, LayoutGrid, FileText, BellRing, Briefcase, Lock, Mail } from 'lucide-react'
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
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="shrink-0">
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
    <main className="min-h-screen flex bg-background text-on-background relative overflow-hidden">
      {/* Background Animated Blobs for entire page on mobile */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 lg:opacity-10">
        <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Left Side: Aurora Illustration (Desktop only) */}
      <section className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-surface-muted border-r border-[var(--color-border)] relative overflow-hidden z-10">
        {/* Animated Aurora Backdrop */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[100px]" />
        </div>

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white">
            <Briefcase className="size-4.5" />
          </div>
          <span className="font-bold text-brand-text text-lg">JobTrackr</span>
        </div>

        {/* Dynamic Visual Pitch */}
        <div className="relative z-10 flex-1 flex flex-col justify-center space-y-10 max-w-md mx-auto">
          <div className="space-y-4">
            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight text-brand-text tracking-tight">
              Your job search, <br />
              <span className="text-accent">actually organized.</span>
            </h1>
            <p className="text-brand-muted text-sm xl:text-base leading-relaxed">
              A calm, intelligent workspace designed to turn career chaos into a streamlined path to your next offer.
            </p>
          </div>

          <div className="space-y-5">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="shrink-0 size-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-bold text-brand-text text-sm xl:text-base leading-snug">{title}</p>
                  <p className="text-xs xl:text-sm text-brand-muted mt-0.5">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Floating UI Glass Mockup Card */}
          <div className="glass-panel rounded-2xl p-5 border border-white/50 shadow-lg text-left relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-3 w-3 rounded-full bg-[var(--color-offer)]" />
              <div className="h-2 w-28 bg-accent/20 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-brand-muted/10 rounded-full" />
              <div className="h-2 w-5/6 bg-brand-muted/10 rounded-full" />
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 text-xs text-brand-muted">
          Free, no ads, no AI subscription required.
        </div>
      </section>

      {/* Right Side: Login Form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 z-10 relative">
        {/* Mobile Header Logo */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white">
            <Briefcase className="size-4.5" />
          </div>
          <span className="font-bold text-brand-text text-lg">JobTrackr</span>
        </div>

        <div className="w-full max-w-[360px] space-y-6">
          <header className="space-y-1">
            <h2 className="font-extrabold text-brand-text text-2xl tracking-tight">
              {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-xs md:text-sm text-brand-muted leading-relaxed">
              {mode === 'sign-in'
                ? 'Please enter your details to sign in.'
                : 'Takes less than a minute — no credit card, ever.'}
            </p>
          </header>

          {/* Social Sign-in button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-[var(--color-border)] rounded-xl py-3 px-4 bg-surface hover:bg-surface-muted transition-all active:scale-[0.98] font-bold text-sm text-brand-text cursor-pointer shadow-sm hover:shadow-md"
          >
            <GoogleLogo />
            <span>Continue with Google</span>
          </button>

          {/* Or Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-[10px] md:text-xs text-brand-muted uppercase font-bold tracking-wider">
              Or continue with email
            </span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-brand-text">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm bg-surface text-brand-text focus:ring-4 focus:ring-accent/5 focus:border-accent focus:outline-none transition-all placeholder:text-brand-muted"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-brand-text">
                  Password
                </label>
                {mode === 'sign-in' && (
                  <a href="#" className="text-xs text-accent font-bold hover:underline">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-11 py-2.5 text-sm bg-surface text-brand-text focus:ring-4 focus:ring-accent/5 focus:border-accent focus:outline-none transition-all placeholder:text-brand-muted font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'sign-up' && (
              <label className="flex items-start gap-2.5 text-xs text-brand-muted leading-tight cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--color-border)] text-accent focus:ring-accent/20"
                />
                <span>
                  I agree to the{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline font-bold">
                    Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-accent underline font-bold">
                    Terms of Service
                  </a>
                  .
                </span>
              </label>
            )}

            {error && (
              <p role="alert" className="text-xs md:text-sm text-[var(--color-rejected)] font-medium">
                {error}
              </p>
            )}
            {info && (
              <p className="text-xs md:text-sm text-[var(--color-offer)] font-medium">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'sign-up' && !consentChecked)}
              className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:shadow-none cursor-pointer"
            >
              {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Mode Switcher footer */}
          <footer className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
                setError(null)
                setInfo(null)
              }}
              className="text-xs md:text-sm text-brand-muted hover:text-brand-text transition-colors cursor-pointer"
            >
              {mode === 'sign-in' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <span className="text-accent font-bold hover:underline">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span className="text-accent font-bold hover:underline">Sign in</span>
                </>
              )}
            </button>
          </footer>
        </div>
      </section>
    </main>
  )
}
