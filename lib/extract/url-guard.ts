import { promises as dns } from 'dns'
import { ExtractError } from './errors'

const MAX_URL_LENGTH = 2048
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal']
const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/

// String-level validation, run before any network call and again on every
// redirect hop. IP literals are rejected outright: no real job posting is
// served from one, so this removes the whole private-range class up front.
export function assertSafeUrl(raw: string): URL {
  if (raw.length > MAX_URL_LENGTH) throw new ExtractError('invalid_url')

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ExtractError('invalid_url')
  }

  if (url.protocol !== 'https:') throw new ExtractError('invalid_url')
  if (url.username || url.password) throw new ExtractError('invalid_url')

  const host = url.hostname.toLowerCase()
  if (host.startsWith('[')) throw new ExtractError('invalid_url')   // URL brackets IPv6 literals
  if (IPV4_LITERAL.test(host)) throw new ExtractError('invalid_url')
  if (host === 'localhost') throw new ExtractError('invalid_url')
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) throw new ExtractError('invalid_url')
  if (!host.includes('.')) throw new ExtractError('invalid_url')

  return url
}

export function isPrivateAddress(address: string, family: number): boolean {
  if (family === 4) {
    const parts = address.split('.').map(Number)
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return true
    const [a, b] = parts
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
  }

  const addr = address.toLowerCase().split('%')[0]
  if (addr === '::1' || addr === '::') return true

  const mapped = addr.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (mapped) return isPrivateAddress(mapped[1], 4)

  const head = Number.parseInt(addr.split(':')[0] || '0', 16)
  if (Number.isNaN(head)) return true
  if ((head & 0xfe00) === 0xfc00) return true   // fc00::/7  unique local
  if ((head & 0xffc0) === 0xfe80) return true   // fe80::/10 link local
  return false
}

// A public hostname can still resolve to a private address, so check what DNS
// actually returns before connecting.
//
// KNOWN GAP, accepted for MVP: a TOCTOU window remains between this lookup and
// the socket's own resolution. Closing it requires a custom HTTP agent pinned
// to the validated address.
export async function assertPublicHost(hostname: string): Promise<void> {
  let results: { address: string; family: number }[]
  try {
    results = await dns.lookup(hostname, { all: true })
  } catch {
    throw new ExtractError('network')
  }
  if (results.length === 0) throw new ExtractError('network')
  for (const { address, family } of results) {
    if (isPrivateAddress(address, family)) throw new ExtractError('invalid_url')
  }
}
