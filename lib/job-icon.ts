export type JobIconKind = 'design' | 'frontend' | 'backend' | 'infra' | 'general'

/**
 * Classifies a job from its role and tags.
 *
 * Returns a plain string rather than a component: assigning a component to a
 * local and rendering it as `<IconComponent />` is what React's
 * `static-components` lint rule flags, and this logic previously lived —
 * verbatim — in three separate files.
 */
export function getJobIconKind(role: string, tags: string[]): JobIconKind {
  const merged = [...tags.map((t) => t.toLowerCase()), role.toLowerCase()]
  const matches = (...needles: string[]) =>
    merged.some((t) => needles.some((n) => t.includes(n)))

  if (matches('design', 'creative', 'figma', 'ui', 'ux', 'product')) return 'design'
  if (matches('frontend', 'react', 'web', 'next.js', 'typescript', 'javascript', 'html', 'css')) return 'frontend'
  if (matches('backend', 'node', 'api', 'database', 'sql', 'python', 'go', 'terminal')) return 'backend'
  if (matches('architect', 'system', 'infra', 'devops', 'cloud', 'aws')) return 'infra'
  return 'general'
}
