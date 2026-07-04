import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_tags')
      .select('tag')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[tags]', error)
      return NextResponse.json({ error: 'Failed to load tags.' }, { status: 500 })
    }

    return NextResponse.json({ data: (data ?? []).map((r) => r.tag as string) })
  } catch (error) {
    console.error('[tags]', error)
    return NextResponse.json({ error: 'Failed to load tags.' }, { status: 500 })
  }
}
