import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@deepseek-ai/schemastery': fileURLToPath(new URL('./test-shims/schemastery.ts', import.meta.url)),
    },
  },
})
