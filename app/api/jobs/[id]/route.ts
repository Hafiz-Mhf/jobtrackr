import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JOB_STATUSES, MAX_FIELD_LENGTH, MAX_TAGS, MAX_TEXT_LENGTH } from '@/lib/constants'
import { learnTags } from '@/lib/tags/learn'

interface PatchJobData {
  company?: string
  role?: string
  url?: string
  description?: string
  status?: string
  salary_range?: string
  location?: string
  tags?: string[]
  notes?: string
  last_updated: string
}

function validatePatchInput(body: unknown): { valid: true; data: PatchJobData } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  if (b.company !== undefined && (typeof b.company !== 'string' || b.company.length > MAX_FIELD_LENGTH)) {
    return { valid: false, error: 'Company must be under 200 characters.' }
  }
  if (b.role !== undefined && (typeof b.role !== 'string' || b.role.length > MAX_FIELD_LENGTH)) {
    return { valid: false, error: 'Role must be under 200 characters.' }
  }
  if (b.status !== undefined && !JOB_STATUSES.includes(b.status as never)) {
    return { valid: false, error: 'Invalid status value.' }
  }
  if (b.notes !== undefined && typeof b.notes === 'string' && b.notes.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: 'Notes are too long.' }
  }
  if (b.description !== undefined && typeof b.description === 'string' && b.description.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: 'Description is too long.' }
  }

  // Build allowlisted update object — only these fields (plus a server-set
  // timestamp) ever reach the DB. Never let the client set id/user_id/created_at.
  const data: PatchJobData = {
    last_updated: new Date().toISOString(),
  }

  if (typeof b.company === 'string') {
    data.company = b.company.trim()
  }
  if (typeof b.role === 'string') {
    data.role = b.role.trim()
  }
  if (typeof b.url === 'string') {
    data.url = b.url
  }
  if (typeof b.description === 'string') {
    data.description = b.description
  }
  if (typeof b.status === 'string') {
    data.status = b.status
  }
  if (typeof b.salary_range === 'string') {
    data.salary_range = b.salary_range
  }
  if (typeof b.location === 'string') {
    data.location = b.location
  }
  if (Array.isArray(b.tags)) {
    data.tags = b.tags
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, MAX_TAGS)
      .map((t) => t.slice(0, MAX_FIELD_LENGTH))
  }
  if (typeof b.notes === 'string') {
    data.notes = b.notes
  }

  return { valid: true, data }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const body = await req.json()
    const validation = validatePatchInput(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(validation.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[jobs/id]', error)
      return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 })
    }

    await learnTags(supabase, user.id, validation.data.tags ?? [])

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[jobs/id]', error)
    return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[jobs/id]', error)
      return NextResponse.json({ error: 'Failed to delete job.' }, { status: 500 })
    }

    return NextResponse.json({ data: { id } })
  } catch (error) {
    console.error('[jobs/id]', error)
    return NextResponse.json({ error: 'Failed to delete job.' }, { status: 500 })
  }
}
