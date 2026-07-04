import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { DangerZone } from '@/components/profile/DangerZone'
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

  return (
    <div className="p-6">
      <div className="max-w-md space-y-8">
        <h1 className="text-xl font-semibold text-brand-text">Profile</h1>
        <ProfileForm
          profile={profile ?? { id: user.id, created_at: user.created_at, updated_at: user.created_at }}
          email={user.email ?? ''}
        />
        <DangerZone />
      </div>
    </div>
  )
}
