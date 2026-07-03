export const AVATAR_BUCKET = 'avatars'

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function getAvatarExtension(mimeType: string): string | null {
  return EXTENSION_BY_MIME_TYPE[mimeType] ?? null
}

export function getAvatarPath(userId: string, mimeType: string): string {
  const extension = getAvatarExtension(mimeType) ?? 'jpg'
  return `${userId}/avatar.${extension}`
}
