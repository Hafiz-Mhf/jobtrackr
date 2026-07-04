import type { SupabaseClient } from '@supabase/supabase-js'
import { isDictionaryTag } from '@/lib/skills'

export const MAX_CUSTOM_TAGS = 500

const TAG_STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'our', 'with', 'job', 'role', 'team', 'work',
  'a', 'an', 'to', 'of', 'in', 'on', 'at', 'is', 'are', 'we', 'us', 'or',
  'this', 'that', 'will', 'your', 'their', 'have', 'has', 'plus', 'etc',
])

/**
 * Pure guard: returns the subset of `tags` worth learning, deduped
 * case-insensitively and capped to the headroom under MAX_CUSTOM_TAGS.
 */
export function filterLearnableTags(tags: string[], existingCount: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of tags) {
    const tag = raw.trim()
    const key = tag.toLowerCase()
    if (tag.length < 2 || tag.length > 30) continue
    if (TAG_STOPWORDS.has(key)) continue
    if (isDictionaryTag(tag)) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
  }
  const headroom = Math.max(0, MAX_CUSTOM_TAGS - existingCount)
  return out.slice(0, headroom)
}

/**
 * Best-effort: persist novel tags for a user. Never throws — a failure is
 * logged and the caller (job save) proceeds unaffected.
 */
export async function learnTags(
  supabase: SupabaseClient,
  userId: string,
  tags: string[],
): Promise<void> {
  try {
    const { data: existing, error: selErr } = await supabase
      .from('user_tags')
      .select('tag')
      .eq('user_id', userId)
    if (selErr) {
      console.error('[tags]', selErr)
      return
    }
    const existingLower = new Set((existing ?? []).map((r) => (r.tag as string).toLowerCase()))
    const novel = tags.filter((t) => !existingLower.has(t.trim().toLowerCase()))
    const learnable = filterLearnableTags(novel, existing?.length ?? 0)
    if (learnable.length === 0) return

    const rows = learnable.map((tag) => ({ user_id: userId, tag }))
    const { error } = await supabase.from('user_tags').insert(rows)
    if (error) console.error('[tags]', error)
  } catch (e) {
    console.error('[tags]', e)
  }
}
