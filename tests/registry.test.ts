import { describe, expect, it } from 'vitest'
import { parseRegistry, parseRegistryEntry, sortRegistry } from '../src/registry.ts'
import type { PluginRegistryEntry } from '../src/types.ts'

const validRow = (): Record<string, unknown> => ({
  id: 'o/a',
  name: 'A',
  packageName: '@x/a',
  description: 'about A',
  icon: '🧩',
  author: 'author',
  repository: 'https://github.com/o/a',
  stars: 12,
  version: '1.0.0',
  changelog: 'initial',
  spec: 'github:o/a',
})

describe('parseRegistryEntry', () => {
  it('accepts a valid row with optional fields', () => {
    const parsed = parseRegistryEntry({ ...validRow(), requirements: ['node >= 20'], download: 'https://x/a.tgz', sha256: 'a'.repeat(64) }, 0)
    expect(parsed.id).toBe('o/a')
    expect(parsed.requirements).toEqual(['node >= 20'])
    expect(parsed.download).toBe('https://x/a.tgz')
    expect(parsed.sha256).toBe('a'.repeat(64))
  })

  it('rejects a row missing a required string', () => {
    const row = validRow()
    delete row.packageName
    expect(() => parseRegistryEntry(row, 3)).toThrow(/packageName/)
  })

  it('rejects a non-numeric stars value', () => {
    expect(() => parseRegistryEntry({ ...validRow(), stars: 'many' }, 0)).toThrow(/stars/)
    expect(() => parseRegistryEntry({ ...validRow(), stars: -1 }, 0)).toThrow(/stars/)
  })

  it('rejects a malformed sha256 and drops it', () => {
    const parsed = parseRegistryEntry({ ...validRow(), sha256: 'not-hex' }, 0)
    expect(parsed.sha256).toBeUndefined()
  })

  it('rejects a non-object row', () => {
    expect(() => parseRegistryEntry('nope', 0)).toThrow(TypeError)
    expect(() => parseRegistryEntry(null, 0)).toThrow(TypeError)
  })
})

describe('parseRegistry', () => {
  it('parses a document into frozen entries in order', () => {
    const parsed = parseRegistry({ plugins: [validRow(), validRow()] })
    expect(parsed).toHaveLength(2)
    expect(parsed[0]?.id).toBe('o/a')
  })

  it('rejects a document without a plugins array', () => {
    expect(() => parseRegistry({})).toThrow(/plugins/)
    expect(() => parseRegistry([])).toThrow(TypeError)
  })
})

describe('sortRegistry', () => {
  const row = (id: string, stars: number): PluginRegistryEntry => ({
    ...(parseRegistryEntry(validRow(), 0)),
    id,
    name: id,
    stars,
  })
  it('orders by stars descending, ties by id', () => {
    const sorted = sortRegistry([row('b', 5), row('a', 9), row('c', 5)])
    expect(sorted.map(e => e.id)).toEqual(['a', 'b', 'c'])
  })
})
