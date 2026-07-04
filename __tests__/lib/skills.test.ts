import { describe, it, expect } from 'vitest'
import { matchDictionary, matchCustomTags, normalizeTag, isDictionaryTag } from '@/lib/skills'

describe('skills dictionary', () => {
  it('matches a canonical term', () => {
    expect(matchDictionary('We use React heavily')).toContain('React')
  })

  it('matches an alias and returns the canonical form', () => {
    expect(matchDictionary('strong k8s experience')).toContain('Kubernetes')
    expect(matchDictionary('built with reactjs')).toContain('React')
  })

  it('is case-insensitive', () => {
    expect(matchDictionary('MUST KNOW typescript')).toContain('TypeScript')
  })

  it('respects word boundaries (no partial matches)', () => {
    expect(matchDictionary('We use Reactive Streams')).not.toContain('React')
  })

  it('matches a multi-word alias', () => {
    expect(matchDictionary('reporting in power bi')).toContain('Power BI')
  })

  it('does not duplicate canonicals when multiple aliases hit', () => {
    const result = matchDictionary('js and javascript and ecmascript')
    expect(result.filter((t) => t === 'JavaScript')).toHaveLength(1)
  })

  it('normalizeTag maps aliases to canonical, passes through unknowns', () => {
    expect(normalizeTag('k8s')).toBe('Kubernetes')
    expect(normalizeTag('REACTJS')).toBe('React')
    expect(normalizeTag('Snowflake')).toBe('Snowflake')
    expect(normalizeTag('  Databricks  ')).toBe('Databricks')
  })

  it('matchCustomTags finds custom tags present in text, case-insensitively', () => {
    expect(matchCustomTags('experience with Snowflake and dbt', ['Snowflake', 'dbt', 'Kafka']))
      .toEqual(['Snowflake', 'dbt'])
  })

  it('isDictionaryTag recognizes canonicals and aliases only', () => {
    expect(isDictionaryTag('React')).toBe(true)
    expect(isDictionaryTag('k8s')).toBe(true)
    expect(isDictionaryTag('Snowflake')).toBe(false)
  })
})
