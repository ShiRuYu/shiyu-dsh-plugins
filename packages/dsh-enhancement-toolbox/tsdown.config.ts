import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: { index: 'src/index.ts', remote: 'src/remote.ts', types: 'src/types.ts' },
    format: ['esm'],
    dts: true,
    outDir: 'lib',
    clean: true,
    external: [/^@deepseek-ai\//, 'react'],
  },
  {
    entry: { client: 'src/client/index.tsx' },
    format: ['esm'],
    dts: true,
    outDir: 'lib',
    clean: false,
    external: [/^@deepseek-ai\//, 'react'],
  },
])
