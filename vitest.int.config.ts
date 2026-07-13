import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/int/**/*.int.spec.ts'],
    globalSetup: ['./tests/int/globalSetup.ts'],
    setupFiles: ['./tests/int/setupFiles.ts'],
    // One shared mongodb-memory-server for the whole run - test files must
    // not run concurrently against it.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@payload-config': path.resolve(dirname, './src/payload.config.ts'),
      '@': path.resolve(dirname, './src'),
    },
  },
})
