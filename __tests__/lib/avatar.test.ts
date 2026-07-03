import { describe, it, expect } from 'vitest'
import { getAvatarExtension, getAvatarPath, AVATAR_BUCKET } from '@/lib/avatar'

describe('getAvatarExtension', () => {
  it('maps image/jpeg to jpg', () => {
    expect(getAvatarExtension('image/jpeg')).toBe('jpg')
  })

  it('maps image/png to png', () => {
    expect(getAvatarExtension('image/png')).toBe('png')
  })

  it('maps image/webp to webp', () => {
    expect(getAvatarExtension('image/webp')).toBe('webp')
  })

  it('returns null for an unsupported type', () => {
    expect(getAvatarExtension('image/gif')).toBeNull()
  })
})

describe('getAvatarPath', () => {
  it('builds a path scoped to the user id', () => {
    expect(getAvatarPath('user-123', 'image/png')).toBe('user-123/avatar.png')
  })
})

describe('AVATAR_BUCKET', () => {
  it('is the avatars bucket', () => {
    expect(AVATAR_BUCKET).toBe('avatars')
  })
})
