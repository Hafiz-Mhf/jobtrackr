import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const backHref = user ? '/dashboard' : '/login'
  const backText = user ? 'Back to Dashboard' : 'Back to Login'

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-12 flex items-center justify-center">
      <div className="max-w-xl w-full bg-surface border border-[var(--color-border)] rounded-2xl p-8 space-y-6 shadow-card">
        <div className="pb-4 border-b border-[var(--color-border)]/60">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 min-h-11 -ml-1 px-1 rounded-md text-sm font-semibold text-accent hover:underline focus-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backText}
          </Link>
          <h1 className="text-2xl font-bold text-brand-text mt-3">Help &amp; Support</h1>
          <p className="text-sm text-brand-muted mt-1 max-w-[60ch]">
            JobTrackr is built and maintained by one person. There&apos;s no support team — just me,
            so the fastest route is email.
          </p>
        </div>

        {/* This page used to list a support desk, a company LinkedIn page and a
            separate "DPO Office", none of which exist, plus a 24-hour response
            time nobody had committed to. One real address instead. */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-surface-muted rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center text-accent shrink-0">
              <Mail className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-brand-muted font-bold uppercase tracking-wider font-mono">
                Email
              </p>
              <a
                href="mailto:hafizfaruqi27@gmail.com"
                className="text-sm font-bold text-brand-text hover:text-accent hover:underline break-all focus-ring rounded-sm"
              >
                hafizfaruqi27@gmail.com
              </a>
            </div>
          </div>
        </div>

        <div className="pt-2 text-center text-xs text-brand-muted font-mono leading-relaxed max-w-[60ch] mx-auto">
          <p>
            This is a side project, so replies may take a few days. For privacy or data requests,
            put &quot;PDPA&quot; in the subject line.
          </p>
        </div>
      </div>
    </main>
  )
}
