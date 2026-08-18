import { describe, expect, it } from 'vitest'
import { formatLogLine, parseLogLine } from '../src/operation-log.ts'
import { sha256Hex, sha256Matches } from '../src/sha256.ts'
import { assertSafePnpmArg } from '../src/package-manager.ts'
import { PLUGIN_CENTER_FILTERS, filterPluginEntries } from '../src/client/plugin-center-store.ts'
import type { PluginCenterEntry } from '../src/types.ts'

describe('operation log', () => {
  it('round-trips a formatted entry', () => {
    const line = formatLogLine({
      timestamp: 123,
      action: 'install',
      packageName: '@x/a',
      version: '1.0.0',
      ok: true,
      message: 'installed @x/a',
    })
    expect(parseLogLine(line)).toEqual({
      timestamp: 123,
      action: 'install',
      packageName: '@x/a',
      version: '1.0.0',
      ok: true,
      message: 'installed @x/a',
    })
  })

  it('skips blank and malformed lines', () => {
    expect(parseLogLine('')).toBeUndefined()
    expect(parseLogLine('not json')).toBeUndefined()
    expect(parseLogLine('{"timestamp":1}')).toBeUndefined()
    expect(parseLogLine('{"timestamp":1,"action":"install","packageName":"x","ok":true,"message":"m","version":5}')).toMatchObject({ version: null })
  })
})

describe('sha256', () => {
  it('computes the known digest of "abc"', () => {
    expect(sha256Hex(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('compares digests in constant time', () => {
    expect(sha256Matches('a'.repeat(64), 'a'.repeat(64))).toBe(true)
    expect(sha256Matches('a'.repeat(64), 'b'.repeat(64))).toBe(false)
    expect(sha256Matches('a'.repeat(63), 'a'.repeat(64))).toBe(false)
  })
})

describe('pnpm argument allowlist', () => {
  it('accepts npm/git specs, scoped names, and temp tarball paths', () => {
    expect(() => assertSafePnpmArg('github:o/r#path:/packages/x')).not.toThrow()
    expect(() => assertSafePnpmArg('@scope/pkg@1.2.3')).not.toThrow()
    expect(() => assertSafePnpmArg('D:\\tmp\\dsh-plugin-x-1.tgz')).not.toThrow()
  })

  it('rejects shell metacharacters and empty/oversized arguments', () => {
    expect(() => assertSafePnpmArg('github:o/r & calc')).toThrow(/unsafe pnpm argument/)
    expect(() => assertSafePnpmArg('x | whoami')).toThrow(/unsafe pnpm argument/)
    expect(() => assertSafePnpmArg('x > file')).toThrow(/unsafe pnpm argument/)
    expect(() => assertSafePnpmArg('')).toThrow(/unsafe pnpm argument/)
    expect(() => assertSafePnpmArg('a'.repeat(2000))).toThrow(/unsafe pnpm argument/)
    expect(() => assertSafePnpmArg('has space')).toThrow(/unsafe pnpm argument/)
  })
})

const entry = (id: string, state: PluginCenterEntry['state'], name = id): PluginCenterEntry => ({
  id,
  name: name.toUpperCase(),
  packageName: `pkg-${id}`,
  description: `about ${name}`,
  icon: '🧩',
  author: 'a',
  repository: 'https://github.com/a/r',
  stars: 1,
  version: '1.0.0',
  installedVersion: state === 'not-installed' ? null : '1.0.0',
  changelog: '',
  requirements: [],
  state,
})

describe('filterPluginEntries', () => {
  const entries: readonly PluginCenterEntry[] = [
    entry('a', 'enabled', 'alpha'),
    entry('b', 'disabled', 'beta'),
    entry('c', 'update-available', 'gamma'),
    entry('d', 'not-installed', 'delta'),
  ]

  it('keeps the catalog order for the all filter', () => {
    expect(filterPluginEntries(entries, '', 'all')).toHaveLength(4)
  })

  it('installed excludes disabled and not-installed', () => {
    expect(filterPluginEntries(entries, '', 'installed').map(e => e.id)).toEqual(['a', 'c'])
  })

  it('updatable matches only update-available', () => {
    expect(filterPluginEntries(entries, '', 'updatable').map(e => e.id)).toEqual(['c'])
  })

  it('disabled matches only disabled', () => {
    expect(filterPluginEntries(entries, '', 'disabled').map(e => e.id)).toEqual(['b'])
  })

  it('searches name, description, and package name case-insensitively', () => {
    expect(filterPluginEntries(entries, 'GAMMA', 'all').map(e => e.id)).toEqual(['c'])
    expect(filterPluginEntries(entries, 'PKG-B', 'all').map(e => e.id)).toEqual(['b'])
    expect(filterPluginEntries(entries, 'about delta', 'all').map(e => e.id)).toEqual(['d'])
  })

  it('declares the toolbar filter order', () => {
    expect(PLUGIN_CENTER_FILTERS).toEqual(['all', 'installed', 'updatable', 'disabled'])
  })
})
