import { describe, expect, it } from 'vitest'
import { parseAwesomeHtml } from '../src/awesome.ts'

const card = (
  owner: string,
  repo: string,
  stars: string,
  description: string,
  spec: string,
): string => `
<li class="card">
  <a class="card-link" href="https://github.com/${owner}/${repo}">
    <span class="owner">${owner}</span>
    ${repo}
  </a>
  <span class="stars">${stars}</span>
  <p>${description}</p>
  <input readonly value="dsh plugin --profile web add ${spec}" />
</li>`

describe('parseAwesomeHtml', () => {
  it('parses a card into a catalog entry', () => {
    const html = card('vectorize-io', 'dsh-pdf', '1234', 'Parse PDFs into markdown', 'github:vectorize-io/dsh-pdf')
    const [parsed] = parseAwesomeHtml(html)
    expect(parsed).toMatchObject({
      id: 'vectorize-io/dsh-pdf',
      name: 'dsh-pdf',
      packageName: 'github:vectorize-io/dsh-pdf',
      author: 'vectorize-io',
      repository: 'https://github.com/vectorize-io/dsh-pdf',
      stars: 1234,
      description: 'Parse PDFs into markdown',
      version: '',
      spec: 'github:vectorize-io/dsh-pdf',
    })
  })

  it('skips cards missing a required field', () => {
    const incomplete = `
<li class="card">
  <a class="card-link" href="https://github.com/o/r"><span class="owner">o</span>r</a>
  <span class="stars">1</span>
  <p>no install command here</p>
</li>`
    expect(parseAwesomeHtml(incomplete)).toHaveLength(0)
  })

  it('disambiguates colliding ids with the spec subpath', () => {
    const html = card('o', 'r', '10', 'a', 'github:o/r#path:/packages/a')
      + card('o', 'r', '10', 'b', 'github:o/r#path:/packages/b')
    const entries = parseAwesomeHtml(html)
    expect(entries).toHaveLength(2)
    expect(entries.map(e => e.id)).toEqual(['o/r#path:/packages/a', 'o/r#path:/packages/b'])
  })

  it('keeps star order as document order', () => {
    const html = card('o', 'low', '1', 'l', 'github:o/low')
      + card('o', 'high', '9001', 'h', 'github:o/high')
    expect(parseAwesomeHtml(html).map(e => e.name)).toEqual(['low', 'high'])
  })
})
