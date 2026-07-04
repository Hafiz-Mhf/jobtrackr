import skillsData from '@/lib/data/skills.json'

interface SkillEntry {
  canonical: string
  aliases: string[]
}

const SKILLS = skillsData as SkillEntry[]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Ambiguous terms that collide with common English words — matched case-sensitively
// so prose like "go above", "the rest", "excel at" doesn't produce phantom tags.
const CASE_SENSITIVE_TERMS = new Set(['Go', 'REST', 'SAP', 'Word', 'Excel', 'Spring'])

// Compile one regex per term ONCE at module load, each mapped to its canonical.
const COMPILED: { canonical: string; re: RegExp }[] = []
for (const entry of SKILLS) {
  for (const term of [entry.canonical, ...entry.aliases]) {
    const flags = CASE_SENSITIVE_TERMS.has(term) ? '' : 'i'
    COMPILED.push({ canonical: entry.canonical, re: new RegExp(`\\b${escapeRegex(term)}\\b`, flags) })
  }
}

// Lowercased alias/canonical -> canonical, built once.
const ALIAS_TO_CANONICAL = new Map<string, string>()
for (const entry of SKILLS) {
  ALIAS_TO_CANONICAL.set(entry.canonical.toLowerCase(), entry.canonical)
  for (const alias of entry.aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), entry.canonical)
  }
}

export function matchDictionary(text: string): string[] {
  const found: string[] = []
  const seen = new Set<string>()
  for (const { canonical, re } of COMPILED) {
    if (!seen.has(canonical) && re.test(text)) {
      seen.add(canonical)
      found.push(canonical)
    }
  }
  return found
}

export function matchCustomTags(text: string, customTags: string[]): string[] {
  return customTags.filter((tag) => {
    const t = tag.trim()
    if (!t) return false
    return new RegExp(`\\b${escapeRegex(t)}\\b`, 'i').test(text)
  })
}

export function normalizeTag(raw: string): string {
  const key = raw.trim().toLowerCase()
  return ALIAS_TO_CANONICAL.get(key) ?? raw.trim()
}

export function isDictionaryTag(tag: string): boolean {
  return ALIAS_TO_CANONICAL.has(tag.trim().toLowerCase())
}
