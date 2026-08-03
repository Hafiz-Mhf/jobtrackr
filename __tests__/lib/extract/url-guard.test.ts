import { describe, it, expect } from 'vitest'
import { assertSafeUrl, isPrivateAddress } from '@/lib/extract/url-guard'
import { ExtractError } from '@/lib/extract/errors'

function rejects(url: string) {
  expect(() => assertSafeUrl(url)).toThrowError(ExtractError)
}

describe('assertSafeUrl', () => {
  it('accepts a normal https job URL', () => {
    expect(assertSafeUrl('https://boards.greenhouse.io/acme/jobs/123').hostname)
      .toBe('boards.greenhouse.io')
  })

  it('rejects http', () => rejects('http://example.com/job'))
  it('rejects a non-http scheme', () => rejects('file:///etc/passwd'))
  it('rejects unparseable input', () => rejects('not a url'))
  it('rejects embedded credentials', () => rejects('https://user:pass@example.com/job'))
  it('rejects localhost', () => rejects('https://localhost/job'))
  it('rejects a .localhost suffix', () => rejects('https://app.localhost/job'))
  it('rejects a .internal suffix', () => rejects('https://metadata.internal/job'))
  it('rejects a .local suffix', () => rejects('https://printer.local/job'))
  it('rejects a bare hostname with no dot', () => rejects('https://intranet/job'))
  it('rejects an IPv4 literal', () => rejects('https://169.254.169.254/latest/meta-data'))
  it('rejects a loopback IPv4 literal', () => rejects('https://127.0.0.1/job'))
  it('rejects an IPv6 literal', () => rejects('https://[::1]/job'))

  it('rejects a URL over 2048 characters', () => {
    rejects(`https://example.com/${'a'.repeat(2100)}`)
  })
})

describe('isPrivateAddress', () => {
  it.each([
    ['10.0.0.1', 4],
    ['172.16.0.1', 4],
    ['172.31.255.255', 4],
    ['192.168.1.1', 4],
    ['127.0.0.1', 4],
    ['169.254.169.254', 4],
    ['0.0.0.0', 4],
    ['::1', 6],
    ['fc00::1', 6],
    ['fd12:3456::1', 6],
    ['fe80::1', 6],
    ['::ffff:10.0.0.1', 6],
  ])('flags %s as private', (address, family) => {
    expect(isPrivateAddress(address, family)).toBe(true)
  })

  it.each([
    ['8.8.8.8', 4],
    ['172.15.0.1', 4],
    ['172.32.0.1', 4],
    ['93.184.216.34', 4],
    ['2606:2800:220:1:248:1893:25c8:1946', 6],
  ])('allows public address %s', (address, family) => {
    expect(isPrivateAddress(address, family)).toBe(false)
  })
})
