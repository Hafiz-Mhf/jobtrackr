import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MAX_TEXT_LENGTH } from '@/lib/constants'
import { ExtractError, EXTRACT_ERROR_MESSAGES, type ExtractErrorCode } from '@/lib/extract/errors'
import { fetchJobPage } from '@/lib/extract/fetch-page'
import { extractJobPosting } from '@/lib/extract/jsonld'
import { htmlToText } from '@/lib/extract/html-to-text'
import { checkRateLimit } from '@/lib/extract/rate-limit'

// dns.promises in the URL guard requires the Node.js runtime.
export const runtime = 'nodejs'

const STATUS_BY_CODE: Record<ExtractErrorCode, number> = {
  invalid_url: 400,
  rate_limited: 429,
  not_html: 415,
  timeout: 504,
  blocked: 502,
  too_large: 502,
  network: 502,
}

function fail(code: ExtractErrorCode) {
  return NextResponse.json({ error: EXTRACT_ERROR_MESSAGES[code] }, { status: STATUS_BY_CODE[code] })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    if (!checkRateLimit(user.id)) return fail('rate_limited')

    const body: unknown = await req.json()
    const rawUrl = typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>).url
      : undefined
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) return fail('invalid_url')

    const html = await fetchJobPage(rawUrl.trim())
    const jobPosting = extractJobPosting(html)

    if (jobPosting) {
      return NextResponse.json({
        data: {
          jobPosting: {
            ...jobPosting,
            description: jobPosting.description.slice(0, MAX_TEXT_LENGTH),
          },
          text: null,
        },
      })
    }

    return NextResponse.json({
      data: { jobPosting: null, text: htmlToText(html).slice(0, MAX_TEXT_LENGTH) },
    })
  } catch (error) {
    // Log the code only — never the fetched body, never the URL.
    if (error instanceof ExtractError) {
      console.error('[jobs/fetch-url]', error.code)
      return fail(error.code)
    }
    console.error('[jobs/fetch-url]', error)
    return NextResponse.json({ error: EXTRACT_ERROR_MESSAGES.network }, { status: 502 })
  }
}
