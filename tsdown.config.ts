/**
 * Self-contained tsdown build for the dual-face plugin. Mirrors the harness's
 * `clientBundle` preset (packages/client/tsdown.client.ts) so this standalone
 * package builds without a harness checkout: `tsc` emits lib/types (host +
 * client), then tsdown bundles the node half (lib/index.js + lib/invariant.js)
 * and the browser half (lib/client.js, a `__ModuleLoader__.load` closure that
 * resolves externals through the injected module table).
 */

import { readFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve as resolvePath, sep } from 'node:path'
import { transform } from 'lightningcss'
import type { UserConfig } from 'tsdown'

const ID = '@ticoguo/dsh-plugin-center'

/** Platform seed modules the shell shares into the frozen module table. */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
] as const

/** The client-runtime store engine is a documented platform-table exemption. */
const CLIENT_EXTERNALS: readonly string[] = [...PLATFORM_MODULES, '@deepseek-ai/dsh-client-runtime/client']

/** Virtual-id wrapper keeping module CSS away from tsdown's own css pipeline. */
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

/** The node half: bundle the tsc-emitted lib/types entries into single files. */
const nodeLibrary: UserConfig = {
  name: ID,
  entry: ['lib/types/index.js', 'lib/types/invariant.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
}

/** The browser half: one closure-factory bundle resolving externals via require. */
const clientBundle: UserConfig = {
  name: `${ID}/client`,
  entry: { client: 'src/client/index.ts' },
  // Browser bundle lands next to the node half (single lib/ artifact dir);
  // clean must stay off so it does not wipe the node-half output above.
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  external: [...CLIENT_EXTERNALS],
  // tsdown auto-externalizes package dependencies; anything NOT in the loader
  // module table must inline instead. A require() the table cannot answer is a
  // guaranteed runtime throw, so the rule is the table list itself.
  noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  plugins: [{
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const abs = importer !== undefined ? resolvePath(dirname(importer), source) : source
      // Keep the virtual id relative to the build root so the emitted bundle
      // never embeds an absolute build-machine path (tsdown prints virtual ids
      // into `//#region` comments).
      const rel = relative(process.cwd(), abs).split(sep).join('/')
      return CSS_VIRTUAL_PREFIX + rel + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = resolvePath(
        process.cwd(),
        virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length),
      )
      ;(this as { addWatchFile(file: string): void }).addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      for (const [local, exp] of Object.entries(cssExports ?? {})) classMap[local] = exp.name
      const tagId = `${ID}/${basename(fileId)}`
      return [
        `const css = ${JSON.stringify(code.toString())};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        `if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {`,
        `  const tag = document.createElement('style');`,
        `  tag.dataset.plugin = ${JSON.stringify(ID)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [nodeLibrary, clientBundle]
