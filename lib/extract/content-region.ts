// Job boards wrap the real posting in a shell: nav, cookie banner, "similar
// jobs" sidebar, footer. Flattening the whole page pulls another job's salary,
// a mid-sentence "City, ST" match and unrelated skill tags into the result, so
// extraction is scoped to the posting container whenever one can be found.

interface Candidate {
  /** Matches the opening tag of the wanted element. */
  pattern: RegExp
  label: string
}

// Ordered most specific first — a known job container beats a generic <main>.
const CANDIDATES: Candidate[] = [
  { label: 'linkedin', pattern: /<(\w+)\b[^>]*\bclass\s*=\s*["'][^"']*\b(?:description__text|show-more-less-html__markup)\b[^"']*["'][^>]*>/i },
  { label: 'indeed', pattern: /<(\w+)\b[^>]*\bid\s*=\s*["']jobDescriptionText["'][^>]*>/i },
  { label: 'seek', pattern: /<(\w+)\b[^>]*\bdata-automation\s*=\s*["'](?:jobAdDetails|jobDescription)["'][^>]*>/i },
  { label: 'generic-job', pattern: /<(\w+)\b[^>]*\b(?:class|id)\s*=\s*["'][^"']*\bjob[-_]?description\b[^"']*["'][^>]*>/i },
  { label: 'article', pattern: /<(article)\b[^>]*>/i },
  { label: 'main-role', pattern: /<(\w+)\b[^>]*\brole\s*=\s*["']main["'][^>]*>/i },
  { label: 'main', pattern: /<(main)\b[^>]*>/i },
]

// An empty container is a client-rendered placeholder, so fall through to the
// next candidate. Thin-but-present content is caught later by the route's
// MIN_USEFUL_TEXT check, which sees the flattened text.

/**
 * Returns the inner HTML of the element holding the job posting, or null when
 * no known container is present (in which case the caller should use the whole
 * document).
 */
export function isolateJobContent(html: string): string | null {
  for (const { pattern } of CANDIDATES) {
    const match = pattern.exec(html)
    if (!match || match.index === undefined) continue

    const tag = match[1].toLowerCase()
    const inner = readInnerHtml(html, tag, match.index + match[0].length)
    if (inner && inner.trim().length > 0) return inner
  }
  return null
}

/**
 * Walks forward from `start` counting nested `<tag>` opens and closes so a
 * container is not cut short at the first `</tag>` belonging to a child.
 */
function readInnerHtml(html: string, tag: string, start: number): string | null {
  const scanner = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'gi')
  scanner.lastIndex = start

  let depth = 1
  let match: RegExpExecArray | null
  while ((match = scanner.exec(html)) !== null) {
    const isClosing = match[1] === '/'
    const isSelfClosing = match[2] === '/'
    if (isSelfClosing) continue
    depth += isClosing ? -1 : 1
    if (depth === 0) return html.slice(start, match.index)
  }

  // Unbalanced markup — take the rest of the document rather than nothing.
  return html.slice(start) || null
}
