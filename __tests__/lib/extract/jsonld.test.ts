import { describe, it, expect } from 'vitest'
import { extractJobPosting } from '@/lib/extract/jsonld'

function page(json: string): string {
  return `<html><head><script type="application/ld+json">${json}</script></head><body>x</body></html>`
}

const FULL = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: 'Senior Frontend Engineer',
  hiringOrganization: { '@type': 'Organization', name: 'Acme Corp' },
  jobLocation: {
    '@type': 'Place',
    address: { '@type': 'PostalAddress', addressLocality: 'Kuala Lumpur', addressRegion: 'WP' },
  },
  baseSalary: {
    '@type': 'MonetaryAmount',
    currency: 'MYR',
    value: { '@type': 'QuantitativeValue', minValue: 8000, maxValue: 12000, unitText: 'MONTH' },
  },
  description: '<p>We use <b>React</b> and TypeScript daily.</p>',
})

describe('extractJobPosting', () => {
  it('maps a complete JobPosting', () => {
    const result = extractJobPosting(page(FULL))
    expect(result).not.toBeNull()
    expect(result?.role).toBe('Senior Frontend Engineer')
    expect(result?.company).toBe('Acme Corp')
    expect(result?.location).toBe('Kuala Lumpur, WP')
    expect(result?.salary_range).toBe('MYR 8,000 - 12,000/mo')
    expect(result?.description).toBe('We use React and TypeScript daily.')
  })

  it('derives tags from the description', () => {
    const result = extractJobPosting(page(FULL))
    expect(result?.tags).toEqual(expect.arrayContaining(['React', 'TypeScript']))
  })

  it('finds a JobPosting inside an @graph wrapper', () => {
    const html = page(JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'Careers' },
        { '@type': 'JobPosting', title: 'Backend Engineer', hiringOrganization: { name: 'Globex' } },
      ],
    }))
    expect(extractJobPosting(html)?.role).toBe('Backend Engineer')
  })

  it('finds a JobPosting inside a top-level array', () => {
    const html = page(JSON.stringify([
      { '@type': 'BreadcrumbList' },
      { '@type': 'JobPosting', title: 'Data Analyst', hiringOrganization: { name: 'Initech' } },
    ]))
    expect(extractJobPosting(html)?.role).toBe('Data Analyst')
  })

  it('accepts an array-valued @type', () => {
    const html = page(JSON.stringify({
      '@type': ['JobPosting', 'Thing'],
      title: 'QA Engineer',
      hiringOrganization: { name: 'Umbrella' },
    }))
    expect(extractJobPosting(html)?.role).toBe('QA Engineer')
  })

  it('takes the first entry when jobLocation is an array', () => {
    const html = page(JSON.stringify({
      '@type': 'JobPosting',
      title: 'DevOps Engineer',
      hiringOrganization: { name: 'Acme' },
      jobLocation: [
        { address: { addressLocality: 'Penang' } },
        { address: { addressLocality: 'Ipoh' } },
      ],
    }))
    expect(extractJobPosting(html)?.location).toBe('Penang')
  })

  it('leaves company blank when hiringOrganization is missing', () => {
    const html = page(JSON.stringify({ '@type': 'JobPosting', title: 'Solo Role' }))
    const result = extractJobPosting(html)
    expect(result?.role).toBe('Solo Role')
    expect(result?.company).toBe('')
  })

  it('leaves role blank when title is missing', () => {
    const html = page(JSON.stringify({ '@type': 'JobPosting', hiringOrganization: { name: 'Acme' } }))
    const result = extractJobPosting(html)
    expect(result?.company).toBe('Acme')
    expect(result?.role).toBe('')
  })

  it('returns null when both title and company are missing', () => {
    const html = page(JSON.stringify({ '@type': 'JobPosting', datePosted: '2026-08-01' }))
    expect(extractJobPosting(html)).toBeNull()
  })

  it('formats a single salary value', () => {
    const html = page(JSON.stringify({
      '@type': 'JobPosting',
      title: 'Engineer',
      hiringOrganization: { name: 'Acme' },
      baseSalary: { currency: 'USD', value: { value: 150000, unitText: 'YEAR' } },
    }))
    expect(extractJobPosting(html)?.salary_range).toBe('USD 150,000/yr')
  })

  it('formats a minimum-only salary', () => {
    const html = page(JSON.stringify({
      '@type': 'JobPosting',
      title: 'Engineer',
      hiringOrganization: { name: 'Acme' },
      baseSalary: { currency: 'RM', value: { minValue: 5000, unitText: 'MONTH' } },
    }))
    expect(extractJobPosting(html)?.salary_range).toBe('RM 5,000+/mo')
  })

  it('leaves salary undefined when baseSalary is absent', () => {
    const html = page(JSON.stringify({
      '@type': 'JobPosting', title: 'Engineer', hiringOrganization: { name: 'Acme' },
    }))
    expect(extractJobPosting(html)?.salary_range).toBeUndefined()
  })

  it('returns null when the page has no JSON-LD at all', () => {
    expect(extractJobPosting('<html><body><h1>Engineer</h1></body></html>')).toBeNull()
  })

  it('skips a malformed block and reads the next one', () => {
    const html = `<script type="application/ld+json">{ not json </script>` +
      page(JSON.stringify({ '@type': 'JobPosting', title: 'Survivor', hiringOrganization: { name: 'Acme' } }))
    expect(extractJobPosting(html)?.role).toBe('Survivor')
  })

  it('skips a non-JobPosting block and reads the next one', () => {
    const html = page(JSON.stringify({ '@type': 'Organization', name: 'Acme' })) +
      page(JSON.stringify({ '@type': 'JobPosting', title: 'Second Block', hiringOrganization: { name: 'Acme' } }))
    expect(extractJobPosting(html)?.role).toBe('Second Block')
  })

  it('does not pollute Object.prototype from a __proto__ payload', () => {
    const html = page('{"@type":"JobPosting","title":"X","hiringOrganization":{"name":"Y"},"__proto__":{"polluted":"yes"}}')
    extractJobPosting(html)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
