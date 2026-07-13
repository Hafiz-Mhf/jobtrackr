import Link from 'next/link'
import { Mail, Globe, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Inline SVG Linkedin icon to avoid lucide-react package version issues
function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

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
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
          >
            <ArrowLeft className="size-4" />
            {backText}
          </Link>
          <h1 className="text-2xl font-bold text-brand-text mt-3">Help & Support</h1>
          <p className="text-sm text-brand-muted mt-1">
            Need assistance or have feedback? Reach out to our support channels below.
          </p>
        </div>

        <div className="space-y-4">
          {/* Email Card */}
          <div className="flex items-center gap-4 bg-surface-muted rounded-xl p-4 border border-[var(--color-border)] shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center text-accent shrink-0">
              <Mail className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-brand-muted font-bold uppercase tracking-wider font-mono">
                Email Support
              </p>
              <a
                href="mailto:support@jobtrackr.com"
                className="text-sm font-bold text-brand-text hover:text-accent hover:underline break-all"
              >
                support@jobtrackr.com
              </a>
            </div>
          </div>

          {/* LinkedIn Card */}
          <div className="flex items-center gap-4 bg-surface-muted rounded-xl p-4 border border-[var(--color-border)] shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center text-accent shrink-0">
              <LinkedinIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-brand-muted font-bold uppercase tracking-wider font-mono">
                LinkedIn Profile
              </p>
              <a
                href="https://linkedin.com/company/jobtrackr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-brand-text hover:text-accent hover:underline break-all"
              >
                linkedin.com/company/jobtrackr
              </a>
            </div>
          </div>

          {/* DPO Card */}
          <div className="flex items-center gap-4 bg-surface-muted rounded-xl p-4 border border-[var(--color-border)] shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center text-accent shrink-0">
              <Globe className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-brand-muted font-bold uppercase tracking-wider font-mono">
                PDPA / DPO Office
              </p>
              <a
                href="mailto:dpo@jobtrackr.com"
                className="text-sm font-bold text-brand-text hover:text-accent hover:underline break-all"
              >
                dpo@jobtrackr.com
              </a>
            </div>
          </div>
        </div>

        <div className="pt-2 text-center text-xs text-brand-muted font-mono leading-relaxed">
          <p>Response times are typically within 24 hours.</p>
          <p className="mt-1">For urgent security requests, please specify in the email subject line.</p>
        </div>
      </div>
    </main>
  )
}
