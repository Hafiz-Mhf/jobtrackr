import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JOB_STATUSES, MAX_FIELD_LENGTH, MAX_TEXT_LENGTH } from '@/lib/constants'

interface InsertJobData {
  company: string
  role: string
  url?: string
  description?: string
  status?: string
  salary_range?: string
  location?: string
  tags?: string[]
  notes?: string
}

function validateJobInput(body: unknown): { valid: true; data: InsertJobData } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  if (typeof b.company !== 'string' || !b.company.trim() || b.company.length > MAX_FIELD_LENGTH) {
    return { valid: false, error: 'Company is required and must be under 200 characters.' }
  }
  if (typeof b.role !== 'string' || !b.role.trim() || b.role.length > MAX_FIELD_LENGTH) {
    return { valid: false, error: 'Role is required and must be under 200 characters.' }
  }
  if (b.status !== undefined && !JOB_STATUSES.includes(b.status as never)) {
    return { valid: false, error: 'Invalid status value.' }
  }
  if (typeof b.description === 'string' && b.description.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: 'Description is too long.' }
  }
  if (typeof b.notes === 'string' && b.notes.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: 'Notes are too long.' }
  }

  // Build allowlisted insert object — only these fields reach the DB
  const insertData: InsertJobData = {
    company: b.company.trim(),
    role: b.role.trim(),
  }

  if (typeof b.url === 'string') {
    insertData.url = b.url
  }
  if (typeof b.description === 'string') {
    insertData.description = b.description
  }
  if (typeof b.status === 'string') {
    insertData.status = b.status
  }
  if (typeof b.salary_range === 'string') {
    insertData.salary_range = b.salary_range
  }
  if (typeof b.location === 'string') {
    insertData.location = b.location
  }
  if (Array.isArray(b.tags)) {
    insertData.tags = b.tags
  }
  if (typeof b.notes === 'string') {
    insertData.notes = b.notes
  }

  return { valid: true, data: insertData }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[jobs]', error)
      return NextResponse.json({ error: 'Failed to load jobs.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[jobs]', error)
    return NextResponse.json({ error: 'Failed to load jobs.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const body = await req.json()
    const validation = validateJobInput(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({ ...validation.data, user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('[jobs]', error)
      return NextResponse.json({ error: 'Failed to save job.' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[jobs]', error)
    return NextResponse.json({ error: 'Failed to save job.' }, { status: 500 })
  }
}
