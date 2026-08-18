import { describe, expect, it } from 'vitest'
import type { PluginRegistryEntry } from '../src/types.ts'
import type { ProfilePluginState } from '../src/profile-state.ts'
import { compareSemver, entryState, mergeCatalog } from '../src/merge.ts'

const entry = (id: string, version = ''): PluginRegistryEntry => Object.freeze({
  id,
  name: id,
  packageName: `pkg-${id}`,
  description: `about ${id}`,
  icon: '🧩',
  author: 'author',
  repository: `https://github.com/author/${id}`,
  stars: 10,
  version,
  changelog: '',
  requirements: Object.freeze([]),
  spec: `github:author/${id}`,
})

const plugins = (packages: [string, string][], disabled: string[] = []): ProfilePluginState => ({
  enabledBundles: packages.map(([, name]) => name),
  disabledNames: new Set(disabled),
  installedNames: new Set(packages.map(([, name]) => name)),
  packages: new Map(packages),
})

describe('compareSemver', () => {
  it('compares the leading numeric triple', () => {
    expect(compareSemver('1.2.3', '1.2.4')).toBeLessThan(0)
    expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0)
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0)
  })

  it('treats missing or non-numeric segments as zero', () => {
    expect(compareSemver('1.2', '1.2.0')).toBe(0)
    expect(compareSemver('1.2.x', '1.2.0')).toBe(0)
  })

  it('ignores build metadata', () => {
    expect(compareSemver('1.2.3+sha.abc', '1.2.3')).toBe(0)
  })

  it('sorts a prerelease before its release', () => {
    expect(compareSemver('1.0.0-rc.1', '1.0.0')).toBeLessThan(0)
    expect(compareSemver('1.0.0', '1.0.0-rc.1')).toBeGreaterThan(0)
    expect(compareSemver('1.0.0-beta.2', '1.0.0-rc.1')).toBe(0) // tag text is not compared
  })
})

describe('entryState', () => {
  it('reports not-installed when the center never installed the entry', () => {
    expect(entryState(entry('o/a'), plugins([]), null, '')).toBe('not-installed')
  })

  it('reports disabled for an intentionally disabled bundle', () => {
    expect(entryState(entry('o/a'), plugins([['o/a', '@x/a']], ['@x/a']), '1.0.0', '1.0.0')).toBe('disabled')
  })

  it('reports update-available from the npm-resolved latest version', () => {
    const state = entryState(entry('o/a'), plugins([['o/a', '@x/a']]), '1.0.0', '1.2.0')
    expect(state).toBe('update-available')
  })

  it('stays enabled when the available version is unknown or not newer', () => {
    expect(entryState(entry('o/a'), plugins([['o/a', '@x/a']]), '1.0.0', '')).toBe('enabled')
    expect(entryState(entry('o/a'), plugins([['o/a', '@x/a']]), '1.0.0', '1.0.0')).toBe('enabled')
  })
})

describe('mergeCatalog', () => {
  it('uses the npm-resolved version when the catalog publishes none', () => {
    const snapshot = mergeCatalog(
      [entry('o/a'), entry('o/b', '3.0.0')],
      plugins([['o/a', '@x/a'], ['o/b', '@x/b']]),
      new Map([['@x/a', '1.0.0'], ['@x/b', '3.0.0']]),
      new Map([['@x/a', '2.0.0']]),
    )
    expect(snapshot.entries[0]?.version).toBe('2.0.0')
    expect(snapshot.entries[0]?.state).toBe('update-available')
    // Catalog-published versions win over the npm lookup.
    expect(snapshot.entries[1]?.version).toBe('3.0.0')
    expect(snapshot.entries[1]?.state).toBe('enabled')
  })

  it('counts only enabled + update-available as installed (matches the Installed tab)', () => {
    const snapshot = mergeCatalog(
      [entry('o/a'), entry('o/b'), entry('o/c')],
      plugins([['o/a', '@x/a'], ['o/b', '@x/b']], ['@x/b']),
      new Map([['@x/a', '1.0.0'], ['@x/b', '1.0.0']]),
      new Map([['@x/a', '1.0.0'], ['@x/b', '1.0.0']]),
    )
    expect(snapshot.entries.map(e => e.state)).toEqual(['enabled', 'disabled', 'not-installed'])
    expect(snapshot.installedCount).toBe(1)
    expect(snapshot.totalCount).toBe(3)
  })
})
