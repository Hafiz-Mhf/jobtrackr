import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function TermsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const backHref = user ? '/dashboard' : '/login'
  const backText = user ? '← Back to Dashboard' : '← Back to Login'

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-12 flex items-center justify-center">
      {/* max-w-xl, not 2xl: at 2xl the prose ran ~87 characters per line, well
          past comfortable reading width. */}
      <div className="max-w-xl w-full bg-surface border border-[var(--color-border)] rounded-2xl p-8 space-y-6 shadow-card">
        <div className="pb-4 border-b border-[var(--color-border)]/60">
          <Link
            href={backHref}
            className="inline-flex items-center min-h-11 -ml-1 px-1 rounded-md text-sm font-semibold text-accent hover:underline focus-ring"
          >
            {backText}
          </Link>
          <h1 className="text-2xl font-bold text-brand-text mt-3">Terms of Service</h1>
          <p className="text-xs text-brand-muted mt-1 font-mono">Last updated: July 13, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            1. Acceptance of Terms
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            By accessing or using JobTrackr, you agree to comply with and be bound by these Terms
            of Service and our Privacy Policy. If you do not agree to these terms, please do not use
            the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            2. Account Registration & Data Consent
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            To use JobTrackr, you must register for an account using a valid email. You consent to the
            collection and processing of your email and authentication metadata in compliance with our
            PDPA-compliant Privacy Policy. You are responsible for safeguarding your login credentials.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            3. User Content & Ownership
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            You retain full ownership rights over any job application details, tags, or notes you add.
            JobTrackr does not claim ownership or sell your personal data. We process your data solely
            to provide job tracking analytics and layout services to you.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            4. Service Termination & Erasure
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            We reserve the right to suspend or terminate accounts that breach security guidelines or
            engage in malicious behavior. You have the right to terminate your account at any time,
            which will trigger immediate and permanent erasure of all your data from our active databases.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            5. Disclaimer of Warranties
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            JobTrackr is provided on an &quot;as is&quot; and &quot;as available&quot; basis. While we strive to maintain
            accurate data parsing and reliable reminders, we make no guarantees about service uptime or
            complete data completeness.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            6. Contact Details
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            JobTrackr is built and maintained by a single developer. For questions about these
            terms, account issues, or anything else, email me directly:
          </p>
          {/* Tinted panel, no border: this sits inside the page card already. */}
          <div className="bg-surface-muted rounded-xl p-4 text-sm font-mono text-brand-text space-y-1">
            <p>
              Email:{' '}
              <a href="mailto:hafizfaruqi27@gmail.com" className="text-accent hover:underline focus-ring rounded-sm">
                hafizfaruqi27@gmail.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
