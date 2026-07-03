import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const [{ data: profile, error: profileError }, { data: jobs, error: jobsError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
    ])

    if (profileError || jobsError) {
      console.error('[profile/export]', profileError ?? jobsError)
      return NextResponse.json({ error: 'Failed to export data.' }, { status: 500 })
    }

    const exportPayload = { profile, jobs }

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="jobtrackr-export.json"',
      },
    })
  } catch (error) {
    console.error('[profile/export]', error)
    return NextResponse.json({ error: 'Failed to export data.' }, { status: 500 })
  }
}
