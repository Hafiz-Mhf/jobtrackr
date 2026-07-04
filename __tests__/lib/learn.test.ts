import { describe, it, expect } from 'vitest'
import { filterLearnableTags, MAX_CUSTOM_TAGS } from '@/lib/tags/learn'

describe('filterLearnableTags', () => {
  it('keeps novel non-dictionary tags', () => {
    expect(filterLearnableTags(['Snowflake', 'dbt'], 0)).toEqual(['Snowflake', 'dbt'])
  })

  it('drops dictionary tags and their aliases', () => {
    expect(filterLearnableTags(['React', 'k8s', 'Snowflake'], 0)).toEqual(['Snowflake'])
  })

  it('drops stopwords', () => {
    expect(filterLearnableTags(['the', 'and', 'Snowflake'], 0)).toEqual(['Snowflake'])
  })

  it('drops too-short and too-long tags', () => {
    const long = 'x'.repeat(31)
    expect(filterLearnableTags(['a', long, 'dbt'], 0)).toEqual(['dbt'])
  })

  it('dedups case-insensitively within a batch', () => {
    expect(filterLearnableTags(['Snowflake', 'snowflake', 'SNOWFLAKE'], 0)).toEqual(['Snowflake'])
  })

  it('caps to the remaining headroom under MAX_CUSTOM_TAGS', () => {
    const result = filterLearnableTags(['aa', 'bb', 'cc'], MAX_CUSTOM_TAGS - 1)
    expect(result).toHaveLength(1)
  })

  it('returns empty when already at the cap', () => {
    expect(filterLearnableTags(['aa', 'bb'], MAX_CUSTOM_TAGS)).toEqual([])
  })
})
