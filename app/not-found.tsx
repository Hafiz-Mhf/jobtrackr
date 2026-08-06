import Link from 'next/link'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="size-16 rounded-2xl bg-accent-light flex items-center justify-center mx-auto mb-5">
          <Compass className="size-7 text-accent" aria-hidden="true" />
        </div>
        <p className="font-mono text-xs font-bold tracking-widest text-brand-muted uppercase">
          Error 404
        </p>
        <h1 className="mt-2 font-bold text-brand-text text-2xl md:text-3xl">Page not found</h1>
        <p className="mt-2 text-sm text-brand-muted leading-relaxed">
          That link doesn&apos;t point anywhere. It may have been moved, or the address might have a
          typo in it.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="min-h-11 px-5 inline-flex items-center justify-center bg-accent hover:bg-accent-hover text-white font-semibold text-sm rounded-xl transition-colors focus-ring"
          >
            Back to the board
          </Link>
          <Link
            href="/jobs"
            className="min-h-11 px-5 inline-flex items-center justify-center bg-surface border border-[var(--color-border)] hover:bg-surface-muted text-brand-text font-semibold text-sm rounded-xl transition-colors focus-ring"
          >
            All applications
          </Link>
        </div>
      </div>
    </main>
  )
}
