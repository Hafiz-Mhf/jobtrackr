import type { ParsedJob } from '@/types'
import { matchDictionary, matchCustomTags, normalizeTag } from '@/lib/skills'

export function parseJobDescription(text: string, customTags: string[] = []): ParsedJob {
  return {
    company:      extractCompany(text),
    role:         extractRole(text),
    salary_range: extractSalary(text),
    location:     extractLocation(text),
    tags:         extractTags(text, customTags),
    description:  text.trim(),
  }
}

// Words that signal a line is a job title rather than a company or heading.
const ROLE_KEYWORDS =
  /\b(engineer|developer|architect|manager|analyst|consultant|designer|specialist|administrator|coordinator|scientist|technician|programmer|lead|director|intern|associate|recruiter|accountant|auditor|support|helpdesk|help\s?desk|qa|tester|scrum\s*master|sre|reliability|ui\/ux|product\s*owner|product\s*manager)\b/i

const LEGAL_SUFFIX_REGEX = /\b(Sdn\s*Bhd|Bhd|LLC|Ltd|Inc|Corp|Corporation|Pte\s*Ltd)\b/i
const NOISE_LINES = /^(apply|share|save|posted|about|requirements|description|responsibilities|job|overview|company|employer|organization|search|sign\s*in|login|register)\b/i

// Common Malaysian locations — matched before the generic "City, ST" regex so a real
// place is recognised and a capitalised job-title fragment isn't mistaken for a location.
// Longer, more specific names first so "Subang Jaya" wins over "Subang", etc.
const MY_LOCATIONS = [
  'Kuala Lumpur', 'Petaling Jaya', 'Subang Jaya', 'Shah Alam', 'Iskandar Puteri',
  'Johor Bahru', 'Kota Kinabalu', 'George Town', 'Mont Kiara', 'Bandar Sunway',
  'Cyberjaya', 'Putrajaya', 'Damansara', 'Bangsar', 'Puchong', 'Cheras', 'Ampang',
  'Kajang', 'Klang', 'Subang', 'Penang', 'Kuching', 'Ipoh', 'Melaka', 'Malacca',
  'Seremban', 'Selangor', 'Sepang', 'Nilai',
].sort((a, b) => b.length - a.length)

function matchMalaysianLocation(text: string): string | undefined {
  for (const city of MY_LOCATIONS) {
    if (new RegExp(`\\b${city.replace(/\s+/g, '\\s+')}\\b`, 'i').test(text)) return city
  }
  return undefined
}

function nonEmptyLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean)
}

function cleanRole(s: string): string {
  // Split by pipe, bullet, dash delimiters and take the first portion
  const base = s.split('\n')[0].split(/\s*(?:\||·|•|–|-|—)\s*/)[0]
  return base.replace(/\s*\[.*$/, '').replace(/\s+(?:at|@)\s+.*$/i, '').trim()
}

function cleanValue(s: string): string {
  return s.split('\n')[0].replace(/[.,;]\s*$/, '').trim()
}

function extractRole(text: string): string {
  const lines = nonEmptyLines(text)

  // 1. Explicit label: "Title:", "Job Title:", "Position:", "Role:"
  const label = text.match(/^\s*(?:job\s*title|title|position|role)\s*[:\-]\s*(.+)$/im)
  if (label?.[1]) return cleanRole(label[1])

  // 2. Specific engineering/tech/product title patterns (including level prefixes)
  const levelPrefix = '(?:senior|junior|mid|lead|staff|principal|associate|director|head\\s+of)?\\s*'
  const rolePattern = '(?:frontend|backend|fullstack|full\\.stack|software|web|mobile|data|devops|cloud|ml|ai|qa|test|ui/ux|product|sre|system|network)'
  const roleKeyword = '(?:engineer|developer|architect|scientist|designer|manager|specialist|analyst|owner|lead|scrum\\s*master)'
  const pattern = new RegExp(`${levelPrefix}${rolePattern}\\s*${roleKeyword}`, 'i')

  for (const line of lines.slice(0, 8)) {
    const match = line.match(pattern)
    if (match) return cleanRole(match[0])
  }

  // 3. First short line that reads like a job title (contains a role keyword)
  for (const line of lines.slice(0, 8)) {
    if (line.length <= 80 && ROLE_KEYWORDS.test(line)) return cleanRole(line)
  }

  // 4. Fallback: first non-empty line (excluding noise)
  for (const line of lines.slice(0, 5)) {
    if (!NOISE_LINES.test(line) && line.length <= 60) return cleanRole(line)
  }

  return lines[0] ? cleanRole(lines[0]) : 'Unknown Role'
}

function extractSalary(text: string): string | undefined {
  const match = text.match(/\$[\d,]+(?:k)?(?:\s*[-–]\s*\$?[\d,]+(?:k)?)?(?:\s*(?:\/yr|\/year|per year|annually))?/i)
  return match?.[0]
}

function extractLocation(text: string): string | undefined {
  // 1. Explicit label: "Location:", "Based in:", "Office:"
  const label = text.match(/^\s*(?:location|based in|office|work location)\s*[:\-]\s*(.+)$/im)
  if (label?.[1]) return cleanValue(label[1])

  // 2. Known Malaysian city / state
  const myCity = matchMalaysianLocation(text)
  if (myCity) return myCity

  // 3. Work-mode keyword
  const remoteMatch = text.match(/\b(remote|hybrid|on.?site|in.?office)\b/i)
  if (remoteMatch) return remoteMatch[0]

  // 4. "City, ST" / "City, Country" — require the comma so a bare capitalised word isn't mistaken for a place
  const cityMatch = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*(?:[A-Z]{2,}|[A-Z][a-z]+))\b/)
  return cityMatch?.[1]
}

function extractCompany(text: string): string {
  const lines = nonEmptyLines(text)

  // 1. Explicit label: "Company:", "Employer:", "Organization:"
  const label = text.match(/^\s*(?:company|employer|organi[sz]ation)\s*[:\-]\s*(.+)$/im)
  if (label?.[1]) return cleanValue(label[1])

  // 2. Look for lines with legal corporate suffixes first
  const prefixCleaner = /^(?:job\s*description\s*(?:for|of)?|hiring\s*(?:at|for)?|careers\s*(?:at)?|about|at|with)\s+/i
  for (const line of lines.slice(0, 10)) {
    const suffixMatch = line.match(LEGAL_SUFFIX_REGEX)
    if (suffixMatch && suffixMatch.index !== undefined) {
      const suffixEnd = suffixMatch.index + suffixMatch[0].length
      const companyPart = line.substring(0, suffixEnd).trim()
      const cleaned = companyPart.replace(prefixCleaner, '').trim()
      if (cleaned.length > 2 && cleaned.length <= 60) {
        return cleaned
      }
    }
    if (NOISE_LINES.test(line)) continue
  }

  // 3. "at <Company>" / "@ <Company>" — capture up to 4 capitalised words
  const atMatch = text.match(/\b(?:at|@)\s+([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+){0,3})/)
  if (atMatch?.[1]) return cleanValue(atMatch[1])

  // 4. First-line heuristic (excluding noise lines)
  for (const line of lines.slice(0, 5)) {
    if (NOISE_LINES.test(line)) continue
    if (isLikelyCompany(line)) return line
  }

  return 'Unknown Company'
}

function isLikelyCompany(line: string): boolean {
  if (/[.!?:]/.test(line)) return false
  if (!/^[A-Z]/.test(line)) return false
  const words = line.split(/\s+/)
  if (words.length < 1 || words.length > 4) return false
  if (ROLE_KEYWORDS.test(line)) return false
  if (NOISE_LINES.test(line)) return false
  return true
}

function extractTags(text: string, customTags: string[] = []): string[] {
  const merged = [...matchDictionary(text), ...matchCustomTags(text, customTags)].map(normalizeTag)
  return [...new Set(merged)]
}
