import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JOB_STATUSES, MAX_FIELD_LENGTH, MAX_TAGS, MAX_TEXT_LENGTH, APPLICATION_SOURCES, REJECTION_REASONS } from '@/lib/constants'
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
  applied_at?: string | null
  source?: string | null
  rejection_reason?: string | null
  rejected_at?: string | null
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
  if (b.source !== undefined && b.source !== '' && b.source !== null && !APPLICATION_SOURCES.includes(b.source as never)) {
    return { valid: false, error: 'Pick a source from the list.' }
  }
  if (b.applied_at !== undefined && b.applied_at !== '' && b.applied_at !== null) {
    if (typeof b.applied_at !== 'string' || Number.isNaN(Date.parse(b.applied_at))) {
      return { valid: false, error: 'Enter a valid applied date.' }
    }
  }
  if (b.rejection_reason !== undefined && b.rejection_reason !== '' && b.rejection_reason !== null && !REJECTION_REASONS.includes(b.rejection_reason as never)) {
    return { valid: false, error: 'Pick a rejection reason from the list.' }
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

  // applied_at: non-empty string sets the date; explicit empty string clears it.
  if (typeof b.applied_at === 'string') {
    data.applied_at = b.applied_at === '' ? null : b.applied_at
  }
  if (typeof b.source === 'string') {
    data.source = b.source === '' ? null : b.source
  }

  // NOTE: rejected_at / rejection_reason bookkeeping is NOT decided here.
  // Whether we're transitioning INTO rejected (vs. already rejected, vs.
  // leaving rejected) depends on the job's *current* DB status, which this
  // pure validator has no access to. That decision is made in the PATCH
  // handler below, after it fetches the current row.

  return { valid: true, data }
}

// Applies rejected_at / rejection_reason bookkeeping onto an already-validated
// update payload, given the job's current (pre-update) status. Must run in the
// PATCH handler because it needs a DB read to know the current status.
function applyRejectionBookkeeping(
  data: PatchJobData,
  targetStatus: string | undefined,
  rawRejectionReason: unknown,
  currentStatus: string | undefined
): PatchJobData {
  const hasRejectionReason = typeof rawRejectionReason === 'string'
  const rejectionReasonValue = hasRejectionReason
    ? (rawRejectionReason === '' ? null : rawRejectionReason)
    : null

  if (targetStatus === 'rejected') {
    if (currentStatus !== 'rejected') {
      // Transition INTO rejected: stamp rejected_at and store the reason.
      data.rejected_at = new Date().toISOString()
      data.rejection_reason = rejectionReasonValue
    } else if (hasRejectionReason) {
      // Already rejected: only touch the reason if the client sent one.
      data.rejection_reason = rejectionReasonValue
    }
  } else if (targetStatus !== undefined) {
    // Moving OUT of rejected (or into any other status): clear both.
    data.rejected_at = null
    data.rejection_reason = null
  } else if (hasRejectionReason) {
    // No status change, just editing the reason in place.
    data.rejection_reason = rejectionReasonValue
  }

  return data
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

    // Read the current status so rejected_at is only stamped on the
    // TRANSITION into rejected, not re-stamped on every edit to an
    // already-rejected job.
    const { data: current } = await supabase
      .from('jobs')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const b = body as Record<string, unknown>
    const updateData = applyRejectionBookkeeping(
      validation.data,
      typeof b.status === 'string' ? b.status : undefined,
      b.rejection_reason,
      current?.status
    )

    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
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
