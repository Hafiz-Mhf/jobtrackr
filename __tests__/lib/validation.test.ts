import { describe, it, expect } from 'vitest'
import { validateFullName, validateAvatarFile, AVATAR_MAX_BYTES } from '@/lib/validation'

describe('validateFullName', () => {
  it('rejects empty string', () => {
    expect(validateFullName('')).toBe('Name is required.')
  })

  it('rejects whitespace-only string', () => {
    expect(validateFullName('   ')).toBe('Name is required.')
  })

  it('rejects non-string input', () => {
    expect(validateFullName(123)).toBe('Name is required.')
  })

  it('rejects a name over 100 characters', () => {
    expect(validateFullName('a'.repeat(101))).toBe('Name must be under 100 characters.')
  })

  it('accepts a valid name', () => {
    expect(validateFullName('Ada Lovelace')).toBeNull()
  })
})

describe('validateAvatarFile', () => {
  it('rejects a disallowed file type', () => {
    expect(validateAvatarFile({ type: 'image/gif', size: 1000 })).toBe(
      'Please upload a JPG, PNG, or WebP image.'
    )
  })

  it('rejects a file over the size limit', () => {
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 })).toBe(
      'Image must be under 2MB.'
    )
  })

  it('accepts a valid png under the limit', () => {
    expect(validateAvatarFile({ type: 'image/png', size: 1024 })).toBeNull()
  })

  it('accepts a file exactly at the size limit', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: AVATAR_MAX_BYTES })).toBeNull()
  })
})
