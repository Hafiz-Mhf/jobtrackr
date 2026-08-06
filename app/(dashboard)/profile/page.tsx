import { redirect } from 'next/navigation'
import { CheckCircle2, Circle, History } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { DangerZone } from '@/components/profile/DangerZone'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  // Profile strength is the share of these three that are actually done.
  // "Account verified" used to render a permanent green tick wired to nothing,
  // and the bar started at 50% for a profile with neither name nor photo.
  const isVerified = Boolean(user.email_confirmed_at ?? user.confirmed_at)
  const hasName = Boolean(profile?.full_name)
  const hasAvatar = Boolean(profile?.avatar_url)
  const checklist = [
    { label: 'Account verified', done: isVerified },
    { label: 'Display name added', done: hasName },
    { label: 'Profile photo uploaded', done: hasAvatar },
  ]
  const completed = checklist.filter((item) => item.done).length
  const strengthPercent = Math.round((completed / checklist.length) * 100)
  const strengthLabel =
    strengthPercent === 100 ? 'Complete' : strengthPercent >= 67 ? 'Advanced' : 'Basic'

  return (
    <div className="p-6 max-w-[var(--content-max)] mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--color-border)] space-y-2">
        <div className="flex items-center gap-2 text-brand-muted text-xs font-medium">
          <span>Account</span>
          <span>&bull;</span>
          <span className="text-accent font-semibold">Profile Settings</span>
        </div>
        <h1 className="font-bold text-brand-text text-2xl md:text-3xl">Profile settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form and Danger Zone */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 md:p-8 shadow-card">
            <ProfileForm
              profile={profile ?? { id: user.id, created_at: user.created_at, updated_at: user.created_at }}
              email={user.email ?? ''}
            />
          </div>

          <div className="bg-[var(--color-rejected)]/5 border border-[var(--color-rejected)]/10 rounded-2xl p-6 md:p-8 shadow-sm">
            <DangerZone />
          </div>
        </div>

        {/* Right Column: Profile Strength & Mock Sessions */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Profile Strength */}
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card space-y-4 relative overflow-hidden">
            <h2 className="font-bold text-brand-text text-base">Profile Strength</h2>
            <div className="space-y-2">
              <div
                className="w-full bg-surface-muted h-2 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={strengthPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completeness"
              >
                {/* scaleX rather than width: animating width forces layout on
                    every frame, and the parent already clips to the pill. */}
                <div
                  className="bg-accent h-full w-full rounded-full origin-left transition-transform duration-500"
                  style={{ transform: `scaleX(${strengthPercent / 100})` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-accent">{strengthLabel}</span>
                <span className="text-brand-muted font-mono">{strengthPercent}% Complete</span>
              </div>
            </div>

            <ul className="space-y-3 pt-2">
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2.5 text-xs md:text-sm text-brand-text"
                >
                  {item.done ? (
                    <CheckCircle2 className="size-4.5 text-[var(--color-offer)] shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className="size-4.5 text-brand-muted shrink-0" aria-hidden="true" />
                  )}
                  <span className={item.done ? '' : 'text-brand-muted'}>{item.label}</span>
                  <span className="sr-only">{item.done ? '— done' : '— not done'}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* A "Logged in from Web App — Active now • Jakarta, ID" row used to
              sit above this one. The app tracks no sessions, devices or
              locations; the city was invented. Only the real event remains. */}
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="font-bold text-brand-text text-base">Account</h2>
            <div className="space-y-4 text-xs md:text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-brand-muted shrink-0">
                  <History className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-brand-text">Account created</p>
                  <p className="text-[10px] md:text-xs text-brand-muted mt-0.5">
                    {profile ? formatDate(profile.created_at) : 'Just now'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
