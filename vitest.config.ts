import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node', // Use node for service tests, component tests can override
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'coverage/',
        // Collections are declarative Payload CMS configs (no testable logic)
        // All collection hooks/functions are tested in their source files:
        // - authenticated, authenticatedOrPublished (src/access/*.spec.ts)
        // - normalizeText (src/utils/search/normalizeText.spec.ts)
        // - createSlugHook (src/utils/slug.spec.ts)
        'src/collections/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
