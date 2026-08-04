import { describe, it, expect } from 'vitest'
import { isolateJobContent } from '@/lib/extract/content-region'

describe('isolateJobContent', () => {
  it('returns null when no known job container is present', () => {
    expect(isolateJobContent('<body><div>hello</div></body>')).toBeNull()
  })

  it("picks LinkedIn's description__text container", () => {
    const html = `
      <nav>Skip to main content</nav>
      <div class="description__text description__text--rich"><p>Real job body</p></div>
      <aside>Similar jobs A$75,000.00</aside>`
    expect(isolateJobContent(html)).toContain('Real job body')
    expect(isolateJobContent(html)).not.toContain('75,000')
  })

  it("picks LinkedIn's show-more-less-html__markup container", () => {
    const html = '<section class="show-more-less-html__markup"><p>Body here</p></section><aside>junk</aside>'
    expect(isolateJobContent(html)).toContain('Body here')
    expect(isolateJobContent(html)).not.toContain('junk')
  })

  it("picks Indeed's #jobDescriptionText", () => {
    const html = '<div id="jobDescriptionText"><p>Indeed body</p></div><div>other</div>'
    expect(isolateJobContent(html)).toContain('Indeed body')
    expect(isolateJobContent(html)).not.toContain('other')
  })

  it("picks Seek's data-automation job ad details", () => {
    const html = '<div data-automation="jobAdDetails"><p>Seek body</p></div><div>other</div>'
    expect(isolateJobContent(html)).toContain('Seek body')
    expect(isolateJobContent(html)).not.toContain('other')
  })

  it('handles nested same-tag elements without closing early', () => {
    const html = '<div id="jobDescriptionText">a<div>b<div>c</div>d</div>e</div><div>OUTSIDE</div>'
    const region = isolateJobContent(html)
    expect(region).toContain('c')
    expect(region).toContain('e')
    expect(region).not.toContain('OUTSIDE')
  })

  it('falls back to <article> then <main> when no specific container matches', () => {
    expect(isolateJobContent('<main><p>Main body</p></main><footer>f</footer>')).toContain('Main body')
    expect(isolateJobContent('<article><p>Art body</p></article><footer>f</footer>')).toContain('Art body')
  })

  it('prefers a specific job container over a generic <main> wrapper', () => {
    const html = '<main>header junk<div id="jobDescriptionText">the body</div>sidebar junk</main>'
    const region = isolateJobContent(html)
    expect(region).toContain('the body')
    expect(region).not.toContain('sidebar junk')
  })

  it('ignores a container whose contents are too short to be a posting', () => {
    expect(isolateJobContent('<div id="jobDescriptionText">  </div>')).toBeNull()
  })
})
