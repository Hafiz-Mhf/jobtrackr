'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: Props) {
  useEffect(() => {
    // Message only, with the standard prefix — never the full error object,
    // which can carry request details.
    console.error('[app-error]', error.message)
  }, [error])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="size-16 rounded-2xl bg-[var(--color-warning-bg)] flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="size-7 text-[var(--color-warning-text)]" aria-hidden="true" />
        </div>
        <h1 className="font-bold text-brand-text text-2xl md:text-3xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-brand-muted leading-relaxed">
          This page didn&apos;t load properly. Your saved applications are unaffected — trying again
          usually clears it.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-brand-muted">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 px-5 inline-flex items-center justify-center bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded-xl transition-colors focus-ring cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="min-h-11 px-5 inline-flex items-center justify-center bg-surface border border-[var(--color-border)] hover:bg-surface-muted text-brand-text font-semibold text-sm rounded-xl transition-colors focus-ring"
          >
            Back to the board
          </Link>
        </div>
      </div>
    </main>
  )
}
