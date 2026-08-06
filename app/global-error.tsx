'use client'

import { useEffect } from 'react'
import './globals.css'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Replaces the root layout when the layout itself throws, so it has to supply
 * its own <html>/<body> and pull in globals.css directly — none of the fonts or
 * providers from app/layout.tsx are available here.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[global-error]', error.message)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <h1 className="font-bold text-brand-text text-2xl md:text-3xl">
              JobTrackr couldn&apos;t start
            </h1>
            <p className="mt-2 text-sm text-brand-muted leading-relaxed">
              Something failed before the app could load. Your data is safe — reloading usually
              fixes it.
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-[11px] text-brand-muted">
                Reference: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-7 min-h-11 px-5 inline-flex items-center justify-center bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded-xl transition-colors focus-ring cursor-pointer"
            >
              Reload JobTrackr
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
