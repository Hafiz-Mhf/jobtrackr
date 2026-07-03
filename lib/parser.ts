import type { ParsedJob } from '@/types'
import { KNOWN_TAGS } from '@/lib/constants'

export function parseJobDescription(text: string): ParsedJob {
  return {
    company:      extractCompany(text),
    role:         extractRole(text),
    salary_range: extractSalary(text),
    location:     extractLocation(text),
    tags:         extractTags(text),
    description:  text.trim(),
  }
}

function extractRole(text: string): string {
  const lines = text.split('\n').slice(0, 5)
  const titlePatterns = [
    /(?:senior|junior|mid|lead|staff)?\s*(?:frontend|backend|fullstack|full.stack|software|web)\s*(?:engineer|developer|architect)/i,
    /(?:react|node|python|java)\s*developer/i,
  ]
  for (const line of lines) {
    for (const pattern of titlePatterns) {
      const match = line.match(pattern)
      if (match) return match[0].trim()
    }
  }
  return lines[0]?.trim() ?? 'Unknown Role'
}

function extractSalary(text: string): string | undefined {
  const match = text.match(/\$[\d,]+(?:k)?(?:\s*[-–]\s*\$?[\d,]+(?:k)?)?(?:\s*(?:\/yr|\/year|per year|annually))?/i)
  return match?.[0]
}

function extractLocation(text: string): string | undefined {
  const remoteMatch = text.match(/\b(remote|hybrid|on.?site|in.?office)\b/i)
  if (remoteMatch) return remoteMatch[0]
  const cityMatch = text.match(/\b([A-Z][a-z]+(?:,\s*[A-Z]{2})?)\b/)
  return cityMatch?.[0]
}

function extractCompany(text: string): string {
  const match = text.match(/(?:[Aa][Tt]|@|[Cc]ompany[:\s]+|[Ee]mployer[:\s]+)\s*([A-Z][A-Za-z0-9 &.,']+)/)
  return match?.[1]?.trim() ?? 'Unknown Company'
}

function extractTags(text: string): string[] {
  return KNOWN_TAGS.filter(tag =>
    new RegExp(`\\b${tag.replace('.', '\\.')}\\b`, 'i').test(text)
  )
}
