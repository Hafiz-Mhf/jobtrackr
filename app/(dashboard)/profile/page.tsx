import { redirect } from 'next/navigation'
import { CheckCircle2, Circle, Laptop, History, ShieldAlert } from 'lucide-react'
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

  // Calculate profile strength
  const hasName = Boolean(profile?.full_name)
  const hasAvatar = Boolean(profile?.avatar_url)
  let strengthPercent = 50
  if (hasName && hasAvatar) strengthPercent = 100
  else if (hasName || hasAvatar) strengthPercent = 75

  return (
    <div className="p-6 max-w-max-content-width mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center gap-2 text-brand-muted text-xs font-medium pb-4 border-b border-[var(--color-border)]">
        <span>Account</span>
        <span>&bull;</span>
        <span className="text-accent font-semibold">Profile Settings</span>
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
            <h4 className="font-bold text-brand-text text-base">Profile Strength</h4>
            <div className="space-y-2">
              <div className="w-full bg-surface-muted h-2 rounded-full overflow-hidden">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-500"
                  style={{ width: `${strengthPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-accent">
                  {strengthPercent === 100 ? 'Complete' : strengthPercent === 75 ? 'Advanced' : 'Basic'}
                </span>
                <span className="text-brand-muted font-mono">{strengthPercent}% Complete</span>
              </div>
            </div>

            <ul className="space-y-3 pt-2">
              <li className="flex items-center gap-2.5 text-xs md:text-sm text-brand-text">
                <CheckCircle2 className="size-4.5 text-[var(--color-offer)] shrink-0" />
                <span>Account verified</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs md:text-sm text-brand-text">
                {hasName ? (
                  <CheckCircle2 className="size-4.5 text-[var(--color-offer)] shrink-0" />
                ) : (
                  <Circle className="size-4.5 text-brand-muted shrink-0" />
                )}
                <span className={hasName ? '' : 'text-brand-muted'}>Display name added</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs md:text-sm text-brand-text">
                {hasAvatar ? (
                  <CheckCircle2 className="size-4.5 text-[var(--color-offer)] shrink-0" />
                ) : (
                  <Circle className="size-4.5 text-brand-muted shrink-0" />
                )}
                <span className={hasAvatar ? '' : 'text-brand-muted'}>Profile photo uploaded</span>
              </li>
            </ul>
          </div>

          {/* Recent Activity */}
          <div className="bg-surface border border-[var(--color-border)] rounded-2xl p-6 shadow-card space-y-4">
            <h4 className="font-bold text-brand-text text-base">Recent Activity</h4>
            <div className="space-y-4 text-xs md:text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center text-accent shrink-0">
                  <Laptop className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-brand-text">Logged in from Web App</p>
                  <p className="text-[10px] md:text-xs text-brand-muted mt-0.5">Active now &bull; Jakarta, ID</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-brand-muted shrink-0 border border-[var(--color-border)]">
                  <History className="size-4" />
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
