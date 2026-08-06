import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Only same-origin, non-protocol-relative paths are honoured. `next` comes off
 * the query string, so without this an attacker could craft a callback URL that
 * bounces a freshly authenticated user to another site.
 */
function safeNext(next: string | null): string {
  if (!next) return '/dashboard'
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[callback]', error)
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}
