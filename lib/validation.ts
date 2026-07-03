import { MAX_NAME_LENGTH } from '@/lib/constants'

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export function validateFullName(name: unknown): string | null {
  if (typeof name !== 'string' || !name.trim()) {
    return 'Name is required.'
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Name must be under ${MAX_NAME_LENGTH} characters.`
  }
  return null
}

export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    return 'Please upload a JPG, PNG, or WebP image.'
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'Image must be under 2MB.'
  }
  return null
}
