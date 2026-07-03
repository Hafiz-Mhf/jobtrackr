import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-brand-bg px-4 py-12">
      <div className="max-w-2xl mx-auto bg-surface border border-[var(--color-border)] rounded-xl p-8 space-y-6">
        <div>
          <Link href="/login" className="text-sm text-accent">
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold text-brand-text mt-2">Privacy Policy</h1>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wide">
            What we collect
          </h2>
          <p className="text-sm text-brand-muted">
            To run JobTrackr we collect your email address and password (handled entirely
            by our authentication provider — we never see or store your password
            ourselves), and, if you choose to add them, your name and a profile photo.
            We also store the job applications you add: company, role, status, and any
            notes you write.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wide">
            What we don&apos;t collect
          </h2>
          <p className="text-sm text-brand-muted">
            We never ask for or store sensitive information — no government ID numbers,
            no financial account details, no health information. We don&apos;t track you
            across other sites.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wide">
            Your data, your control
          </h2>
          <p className="text-sm text-brand-muted">
            From your Profile page you can update your name and photo, download a copy
            of everything we have on you, or permanently delete your account and all
            associated data at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-text uppercase tracking-wide">
            Questions
          </h2>
          <p className="text-sm text-brand-muted">
            Contact the site owner via the email associated with this domain.
          </p>
        </section>
      </div>
    </main>
  )
}
