import { describe, it, expect } from 'vitest'
import { readPageMetadata, readMetaJobFields } from '@/lib/extract/metadata'

describe('readPageMetadata', () => {
  it('reads og:title, og:description and og:site_name', () => {
    const html = `
      <meta property="og:title" content="Acme hiring Backend Engineer in Penang | LinkedIn">
      <meta property="og:description" content="We are hiring.">
      <meta property="og:site_name" content="LinkedIn">`
    const meta = readPageMetadata(html)
    expect(meta.title).toBe('Acme hiring Backend Engineer in Penang | LinkedIn')
    expect(meta.description).toBe('We are hiring.')
    expect(meta.siteName).toBe('LinkedIn')
  })

  it('reads attributes written in either order', () => {
    const html = '<meta content="Reversed" property="og:title">'
    expect(readPageMetadata(html).title).toBe('Reversed')
  })

  it('falls back to <title> and name="description"', () => {
    const html = '<title>Plain Title</title><meta name="description" content="Plain desc">'
    const meta = readPageMetadata(html)
    expect(meta.title).toBe('Plain Title')
    expect(meta.description).toBe('Plain desc')
  })

  it('decodes entities in metadata values', () => {
    const html = '<meta property="og:title" content="R&amp;D Lead">'
    expect(readPageMetadata(html).title).toBe('R&D Lead')
  })

  it('returns an empty object when there is no metadata', () => {
    expect(readPageMetadata('<p>nothing</p>')).toEqual({})
  })
})

describe('readMetaJobFields', () => {
  it('splits the LinkedIn "X hiring Y in Z" title into company, role and location', () => {
    const html =
      '<meta property="og:title" content="Droit de la famille Actu hiring Fresher Data Analys (Entry / Junior Level) in Australia | LinkedIn">'
    expect(readMetaJobFields(html)).toEqual({
      company: 'Droit de la famille Actu',
      role: 'Fresher Data Analys (Entry / Junior Level)',
      location: 'Australia',
    })
  })

  it('handles a LinkedIn title with no location segment', () => {
    const html = '<meta property="og:title" content="Grab hiring Senior Frontend Engineer | LinkedIn">'
    expect(readMetaJobFields(html)).toEqual({
      company: 'Grab',
      role: 'Senior Frontend Engineer',
    })
  })

  it('keeps a company name containing " in " intact by splitting on the last " in "', () => {
    const html =
      '<meta property="og:title" content="Made in Malaysia Sdn Bhd hiring Data Engineer in Kuala Lumpur | LinkedIn">'
    expect(readMetaJobFields(html)).toEqual({
      company: 'Made in Malaysia Sdn Bhd',
      role: 'Data Engineer',
      location: 'Kuala Lumpur',
    })
  })

  it('returns null for a title that does not match a known pattern', () => {
    expect(readMetaJobFields('<meta property="og:title" content="Careers at Acme">')).toBeNull()
  })

  it('returns null when there is no metadata at all', () => {
    expect(readMetaJobFields('<p>nothing</p>')).toBeNull()
  })
})
