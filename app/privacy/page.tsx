import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const backHref = user ? '/dashboard' : '/login'
  const backText = user ? '← Back to Dashboard' : '← Back to Login'

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-12 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-surface border border-[var(--color-border)] rounded-2xl p-8 space-y-6 shadow-card">
        <div className="pb-4 border-b border-[var(--color-border)]/60">
          <Link href={backHref} className="text-sm font-semibold text-accent hover:underline">
            {backText}
          </Link>
          <h1 className="text-2xl font-bold text-brand-text mt-3">Privacy Policy (PDPA Compliant)</h1>
          <p className="text-xs text-brand-muted mt-1 font-mono">Last updated: July 13, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            1. Consent & Scope
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            In compliance with the Personal Data Protection Act (PDPA), by creating an account and
            using JobTrackr, you explicitly consent to the collection, storage, processing, and use
            of your personal data as outlined in this Policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            2. Purpose of Collection
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            We collect and process your personal data solely for the following purposes:
          </p>
          <ul className="list-disc pl-5 text-sm text-brand-muted space-y-1">
            <li>To manage your account, authentication sessions, and job search records.</li>
            <li>To render personalized dashboards, stats, and active job reminders.</li>
            <li>To facilitate self-service profile updates and secure private notes storage.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            3. Personal Data Collected
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            We limit data collection to the minimum required to operate the application:
          </p>
          <ul className="list-disc pl-5 text-sm text-brand-muted space-y-1">
            <li><strong>Account details:</strong> Email address and profile display name.</li>
            <li><strong>Profile info:</strong> Custom profile picture / avatar.</li>
            <li><strong>Job tracking data:</strong> Position names, companies, location details, salary values, custom tags, and private notes.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            4. Access & Correction Rights
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            Under PDPA rules, you hold full rights to access, inspect, correct, or request portability
            of your personal data. You can perform all of these actions directly from your
            <Link href="/profile" className="text-accent underline font-semibold mx-1">
              Settings Page
            </Link>
            at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            5. Data Retention & Erasure
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            We retain your data only for as long as your account is active. You may permanently delete
            your profile and immediately erase all associated database records and uploads at any time
            via the account deletion portal in settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider font-mono">
            6. Contacting the DPO
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            If you have questions regarding this Privacy Policy, compliance with the PDPA, or want to
            lodge a data request, contact our Data Protection Officer (DPO) at:
          </p>
          <div className="bg-surface-muted rounded-xl p-4 border border-[var(--color-border)] text-sm font-mono text-brand-text space-y-1">
            <p>Email: <a href="mailto:dpo@jobtrackr.com" className="text-accent hover:underline">dpo@jobtrackr.com</a></p>
            <p>Subject: PDPA Data Inquiry</p>
          </div>
        </section>
      </div>
    </main>
  )
}
