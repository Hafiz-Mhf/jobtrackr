import { ExtractError } from './errors'
import { assertSafeUrl, assertPublicHost } from './url-guard'

const TIMEOUT_MS = 8000
const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3
const USER_AGENT = 'JobTrackrBot/1.0 (job posting reader)'
const HTML_CONTENT_TYPES = ['text/html', 'application/xhtml+xml']

export async function fetchJobPage(rawUrl: string): Promise<string> {
  let url = assertSafeUrl(rawUrl)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname)

    let res: Response
    try {
      res = await fetch(url, {
        // Manual redirects: a public page must not be able to bounce us to an
        // internal address without re-validation.
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml',
        },
      })
    } catch (error) {
      const name = error instanceof Error ? error.name : ''
      if (name === 'TimeoutError' || name === 'AbortError') throw new ExtractError('timeout')
      throw new ExtractError('network')
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new ExtractError('network')
      url = assertSafeUrl(new URL(location, url).toString())
      continue
    }

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new ExtractError('blocked')
    }
    if (!res.ok) throw new ExtractError('network')

    const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
    if (!HTML_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
      throw new ExtractError('not_html')
    }

    return readCapped(res)
  }

  throw new ExtractError('network')
}

// Caps by counting bytes off the stream rather than trusting Content-Length.
async function readCapped(res: Response): Promise<string> {
  if (!res.body) throw new ExtractError('network')

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) {
        await reader.cancel()
        throw new ExtractError('too_large')
      }
      chunks.push(value)
    }
  } catch (error) {
    if (error instanceof ExtractError) throw error
    throw new ExtractError('network')
  }

  const merged = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8').decode(merged)
}
