// Detects when the entire input is a single URL, so ParseInput can route it to
// the fetch endpoint. Prose that merely contains a link takes the text path.
export function isSingleUrl(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed || /\s/.test(trimmed)) return null
  if (!/^https?:\/\//i.test(trimmed)) return null
  try {
    new URL(trimmed)
    return trimmed
  } catch {
    return null
  }
}
