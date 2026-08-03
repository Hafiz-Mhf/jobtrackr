import { describe, it, expect } from 'vitest'
import { htmlToText, decodeEntities } from '@/lib/extract/html-to-text'

describe('htmlToText', () => {
  it('drops script content', () => {
    expect(htmlToText('<p>Real</p><script>var secret = 1</script>')).toBe('Real')
  })

  it('drops style content', () => {
    expect(htmlToText('<style>.a{color:red}</style><p>Real</p>')).toBe('Real')
  })

  it('drops nav and footer content', () => {
    expect(htmlToText('<nav>Home About</nav><p>Real</p><footer>Legal</footer>')).toBe('Real')
  })

  it('drops HTML comments', () => {
    expect(htmlToText('<p>Real</p><!-- hidden note -->')).toBe('Real')
  })

  it('turns <br> into a newline', () => {
    expect(htmlToText('one<br>two')).toBe('one\ntwo')
  })

  it('puts adjacent paragraphs on separate lines', () => {
    expect(htmlToText('<p>one</p><p>two</p>')).toBe('one\ntwo')
  })

  it('puts list items on separate lines', () => {
    expect(htmlToText('<ul><li>React</li><li>Node.js</li></ul>')).toBe('React\nNode.js')
  })

  it('drops blank lines left behind by empty block tags', () => {
    expect(htmlToText('<p>one</p><div></div><div></div><p>two</p>')).toBe('one\ntwo')
  })

  it('strips inline tags without gluing words together', () => {
    expect(htmlToText('<p>We use <b>React</b> daily</p>')).toBe('We use React daily')
  })

  it('decodes entities in the output', () => {
    expect(htmlToText('<p>R&amp;D &mdash; it&#39;s great</p>')).toBe("R&D — it's great")
  })

  it('does not resurrect an encoded script tag as markup', () => {
    expect(htmlToText('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')).toBe('<script>alert(1)</script>')
  })

  it('returns an empty string for empty input', () => {
    expect(htmlToText('')).toBe('')
  })
})

describe('decodeEntities', () => {
  it('decodes named entities', () => {
    expect(decodeEntities('a &amp; b &lt; c &nbsp;d')).toBe('a & b < c  d')
  })

  it('decodes decimal and hex numeric entities', () => {
    expect(decodeEntities('&#39;&#x27;')).toBe("''")
  })

  it('leaves an unknown entity untouched', () => {
    expect(decodeEntities('&notarealentity;')).toBe('&notarealentity;')
  })

  it('drops an out-of-range code point instead of throwing', () => {
    expect(decodeEntities('a&#1114112;b')).toBe('ab')
  })
})
