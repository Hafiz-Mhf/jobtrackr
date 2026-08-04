import type { ParsedJob } from '@/types'
import { matchDictionary, normalizeTag } from '@/lib/skills'
import { htmlToText } from './html-to-text'

const SCRIPT_BLOCK =
  /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

function hasType(node: JsonObject, type: string): boolean {
  const declared = node['@type']
  if (typeof declared === 'string') return declared === type
  if (Array.isArray(declared)) return declared.includes(type)
  return false
}

// A JSON-LD document may be a bare node, an array of nodes, or an @graph wrapper.
function findJobPosting(root: unknown, depth = 0): JsonObject | null {
  if (depth > 5) return null
  if (Array.isArray(root)) {
    for (const item of root) {
      const found = findJobPosting(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (!isObject(root)) return null
  if (hasType(root, 'JobPosting')) return root
  return findJobPosting(root['@graph'], depth + 1)
}

function readCompany(node: JsonObject): string | undefined {
  const org = node['hiringOrganization']
  if (typeof org === 'string') return str(org)
  if (isObject(org)) return str(org['name'])
  return undefined
}

function readLocation(node: JsonObject): string | undefined {
  const raw = node['jobLocation']
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first === 'string') return str(first)
  if (!isObject(first)) return undefined

  const address = first['address']
  if (typeof address === 'string') return str(address)
  if (!isObject(address)) return undefined

  const parts = [str(address['addressLocality']), str(address['addressRegion'])].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return str(address['addressCountry'])
}

const UNIT_LABELS: Record<string, string> = {
  HOUR: '/hr', DAY: '/day', WEEK: '/wk', MONTH: '/mo', YEAR: '/yr',
}

function readSalary(node: JsonObject): string | undefined {
  const base = node['baseSalary']
  if (!isObject(base)) return undefined

  const value = base['value']
  const amount = isObject(value) ? value : base

  const min = num(amount['minValue'])
  const max = num(amount['maxValue'])
  const single = num(amount['value'])

  const currency = str(base['currency']) ?? str(base['currencyCode'])
  const prefix = currency ? `${currency} ` : ''
  const unit = UNIT_LABELS[String(amount['unitText'] ?? '').toUpperCase()] ?? ''
  const fmt = (n: number) => n.toLocaleString('en-US')

  if (min !== undefined && max !== undefined) return `${prefix}${fmt(min)} - ${fmt(max)}${unit}`
  if (min !== undefined) return `${prefix}${fmt(min)}+${unit}`
  if (single !== undefined) return `${prefix}${fmt(single)}${unit}`
  return undefined
}

// Reads named fields one at a time and never spreads the parsed object, so a
// __proto__ or constructor key in attacker-controlled JSON cannot pollute.
function mapJobPosting(node: JsonObject): ParsedJob | null {
  const role = str(node['title'])
  const company = readCompany(node)
  if (!role && !company) return null

  const description = htmlToText(str(node['description']) ?? '')

  return {
    // Blank, not a placeholder — the form shows it as an empty required field.
    company: company ?? '',
    role: role ?? '',
    salary_range: readSalary(node),
    location: readLocation(node),
    tags: [...new Set(matchDictionary(description).map(normalizeTag))],
    description,
  }
}

export function extractJobPosting(html: string): ParsedJob | null {
  for (const match of html.matchAll(SCRIPT_BLOCK)) {
    const raw = match[1]?.trim()
    if (!raw) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue // one malformed block must not stop the others
    }

    const node = findJobPosting(parsed)
    if (!node) continue

    const mapped = mapJobPosting(node)
    if (mapped) return mapped
  }
  return null
}
