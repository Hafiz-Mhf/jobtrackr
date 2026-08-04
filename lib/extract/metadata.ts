import { decodeEntities } from './html-to-text'

// Not every board ships JSON-LD — LinkedIn serves none at all, to any
// user-agent. Most still emit accurate Open Graph tags, which beat scraping
// headline fields out of the page's visible text.

export interface PageMetadata {
  title?: string
  description?: string
  siteName?: string
}

export interface MetaJobFields {
  company?: string
  role?: string
  location?: string
}

function readMeta(html: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attrFirst = new RegExp(
    `<meta\\b[^>]*\\b(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*\\bcontent\\s*=\\s*["']([^"']*)["']`,
    'i'
  )
  const contentFirst = new RegExp(
    `<meta\\b[^>]*\\bcontent\\s*=\\s*["']([^"']*)["'][^>]*\\b(?:property|name)\\s*=\\s*["']${escaped}["']`,
    'i'
  )
  const raw = html.match(attrFirst)?.[1] ?? html.match(contentFirst)?.[1]
  const value = raw ? decodeEntities(raw).trim() : ''
  return value || undefined
}

export function readPageMetadata(html: string): PageMetadata {
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const meta: PageMetadata = {
    title: readMeta(html, 'og:title') ?? readMeta(html, 'twitter:title') ?? (titleTag ? decodeEntities(titleTag).trim() || undefined : undefined),
    description: readMeta(html, 'og:description') ?? readMeta(html, 'description'),
    siteName: readMeta(html, 'og:site_name'),
  }
  // Keep the object clean so callers can treat "no metadata" as {}.
  for (const key of Object.keys(meta) as (keyof PageMetadata)[]) {
    if (meta[key] === undefined) delete meta[key]
  }
  return meta
}

// LinkedIn titles read "<Company> hiring <Role> in <Location> | LinkedIn".
const LINKEDIN_TITLE = /^(.+?)\s+hiring\s+(.+?)\s*(?:\|\s*LinkedIn)?$/i

function splitTrailingLocation(rest: string): { role: string; location?: string } {
  // Split on the LAST " in " so a role or company containing " in " survives.
  const idx = rest.toLowerCase().lastIndexOf(' in ')
  if (idx === -1) return { role: rest.trim() }
  const role = rest.slice(0, idx).trim()
  const location = rest.slice(idx + 4).trim()
  if (!role || !location) return { role: rest.trim() }
  return { role, location }
}

/**
 * Pulls company/role/location out of a page title that follows a known job
 * board pattern. Returns null when the title is not one of those patterns —
 * the caller should then fall back to text parsing.
 */
export function readMetaJobFields(html: string): MetaJobFields | null {
  const { title } = readPageMetadata(html)
  if (!title) return null

  const stripped = title.replace(/\s*\|\s*LinkedIn\s*$/i, '').trim()
  const match = stripped.match(LINKEDIN_TITLE)
  if (!match) return null

  const company = match[1].trim()
  const { role, location } = splitTrailingLocation(match[2])
  if (!company || !role) return null

  const fields: MetaJobFields = { company, role }
  if (location) fields.location = location
  return fields
}
