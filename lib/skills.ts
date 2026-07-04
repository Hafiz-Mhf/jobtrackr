import skillsData from '@/lib/data/skills.json'

interface SkillEntry {
  canonical: string
  aliases: string[]
}

const SKILLS = skillsData as SkillEntry[]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Compile one regex per entry ONCE at module load, not per call.
const COMPILED: { canonical: string; re: RegExp }[] = SKILLS.map((entry) => {
  const terms = [entry.canonical, ...entry.aliases].map(escapeRegex)
  return {
    canonical: entry.canonical,
    re: new RegExp(`\\b(?:${terms.join('|')})\\b`, 'i'),
  }
})

// Lowercased alias/canonical -> canonical, built once.
const ALIAS_TO_CANONICAL = new Map<string, string>()
for (const entry of SKILLS) {
  ALIAS_TO_CANONICAL.set(entry.canonical.toLowerCase(), entry.canonical)
  for (const alias of entry.aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), entry.canonical)
  }
}

export function matchDictionary(text: string): string[] {
  return COMPILED.filter((c) => c.re.test(text)).map((c) => c.canonical)
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
