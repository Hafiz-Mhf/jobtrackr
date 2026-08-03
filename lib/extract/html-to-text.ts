const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  bull: '•', middot: '·',
}

function safeCodePoint(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return ''
  try {
    return String.fromCodePoint(n)
  } catch {
    return ''
  }
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
}

// Elements whose text is never part of a job description.
const DROPPED_ELEMENTS =
  /<(script|style|noscript|svg|nav|header|footer|iframe|template|form)\b[^>]*>[\s\S]*?<\/\1>/gi

// Tags that imply a line break in the rendered page.
const BLOCK_TAGS =
  /<\/?(p|div|br|li|ul|ol|tr|td|h[1-6]|section|article|table|blockquote|pre)\b[^>]*>/gi

export function htmlToText(html: string): string {
  // Tags are stripped before entities are decoded, so encoded markup in the
  // source stays inert text instead of becoming a real tag.
  const stripped = html
    .replace(DROPPED_ELEMENTS, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(BLOCK_TAGS, '\n')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(stripped)
    .replace(/\r/g, '')
    .replace(/[ \t\f\v ]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n')
}
