import type { ParsedJob } from '@/types'
import { matchDictionary, matchCustomTags, normalizeTag } from '@/lib/skills'

export function parseJobDescription(text: string, customTags: string[] = []): ParsedJob {
  const company = extractCompany(text)
  let role = extractRole(text)

  // Safeguard: If the extracted role matches the company exactly on a single-line input, fallback to "Unknown Role"
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (role.toLowerCase() === company.toLowerCase() && lines.length <= 1) {
    role = 'Unknown Role'
  }

  return {
    company,
    role,
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
  const salaryRegex = /(?:RM|MYR|SGD|USD|\$|£|€|¥|Rs)\s*\d+(?:[\d,.]*\d)?\s*[kK]?(?:\s*(?:-|–|to)\s*(?:RM|MYR|SGD|USD|\$|£|€|¥|Rs)?\s*\d+(?:[\d,.]*\d)?\s*[kK]?)?(?:\s*(?:\/|per\s+)?(?:yr|year|annually|mo|month|monthly|hr|hour|hourly))?/i
  const match = text.match(salaryRegex)
  return match?.[0]
}

const WORK_MODE_REGEX = /\b(remote|hybrid|on[.\-\s]?site|onsite|in[.\-\s]?office|office[\-\s]?based|wfh|work\s+from\s+home)\b/i

function normalizeWorkMode(raw: string): string {
  const lower = raw.toLowerCase().replace(/[\s.\-]+/g, '')
  if (lower === 'wfh' || lower === 'workfromhome') return 'Remote'
  if (lower === 'onsite' || lower === 'inoffice' || lower === 'officebased') return 'On-site'
  if (lower === 'hybrid') return 'Hybrid'
  if (lower === 'remote') return 'Remote'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function extractLocation(text: string): string | undefined {
  // Detect work mode anywhere in text
  const workModeMatch = text.match(WORK_MODE_REGEX)
  const workMode = workModeMatch ? normalizeWorkMode(workModeMatch[1]) : undefined

  // 1. Explicit label: "Location:", "Based in:", "Office:"
  const label = text.match(/^\s*(?:location|based in|office|office location|work location)\s*[:\-]\s*(.+)$/im)
  if (label?.[1]) {
    const loc = cleanValue(label[1])
    if (workMode && !new RegExp(workMode, 'i').test(loc)) {
      return `${loc} (${workMode})`
    }
    return loc
  }

  // 2. Known Malaysian city / state
  const myCity = matchMalaysianLocation(text)
  if (myCity) {
    if (workMode) return `${myCity} (${workMode})`
    return myCity
  }

  // 3. "City, ST" / "City, Country"
  const cityMatch = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*(?:[A-Z]{2,}|[A-Z][a-z]+))\b/)
  if (cityMatch?.[1]) {
    const geo = cityMatch[1]
    if (workMode && !new RegExp(workMode, 'i').test(geo)) {
      return `${geo} (${workMode})`
    }
    return geo
  }

  // 4. Work-mode keyword only
  return workMode
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
