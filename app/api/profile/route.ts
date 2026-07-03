import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateFullName } from '@/lib/validation'

interface PatchProfileData {
  full_name?: string
  avatar_url?: string
  updated_at: string
}

function validatePatchInput(
  body: unknown,
  userId: string
): { valid: true; data: PatchProfileData } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  if (b.full_name !== undefined) {
    const nameError = validateFullName(b.full_name)
    if (nameError) {
      return { valid: false, error: nameError }
    }
  }
  if (b.avatar_url !== undefined) {
    if (typeof b.avatar_url !== 'string') {
      return { valid: false, error: 'Invalid avatar URL.' }
    }
    // Sanity-check the URL server-side: it must be a real Supabase Storage
    // public URL scoped to this user's own avatars folder, not an arbitrary string.
    const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/`
    if (!b.avatar_url.startsWith(expectedPrefix)) {
      return { valid: false, error: 'Invalid avatar URL.' }
    }
  }

  // Allowlisted update — only these fields (plus a server-set timestamp) ever reach the DB.
  const data: PatchProfileData = { updated_at: new Date().toISOString() }
  if (typeof b.full_name === 'string') {
    data.full_name = b.full_name.trim()
  }
  if (typeof b.avatar_url === 'string') {
    data.avatar_url = b.avatar_url
  }

  return { valid: true, data }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const body = await req.json()
    const validation = validatePatchInput(body, user.id)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(validation.data)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[profile]', error)
      return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[profile]', error)
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Best-effort avatar cleanup — account deletion must not fail if this fails.
    const { error: storageError } = await admin.storage.from('avatars').remove([
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.png`,
      `${user.id}/avatar.webp`,
    ])
    if (storageError) {
      console.error('[profile]', storageError)
    }

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('[profile]', error)
      return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
    }

    return NextResponse.json({ data: { id: user.id } })
  } catch (error) {
    console.error('[profile]', error)
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
  }
}
