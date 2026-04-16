import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['typescript', 'react', 'nextjs', 'jsx-a11y', 'import'],
  settings: {
    next: {
      rootDir: '.',
    },
  },
  rules: {
    // Core JS rules (matching previous ESLint config)
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',

    // TypeScript rules (matching @typescript-eslint recommended)
    'typescript/ban-ts-comment': 'error',
    'typescript/no-array-constructor': 'error',
    'typescript/no-duplicate-enum-values': 'error',
    'typescript/no-empty-object-type': 'error',
    'typescript/no-explicit-any': 'error',
    'typescript/no-extra-non-null-assertion': 'error',
    'typescript/no-misused-new': 'error',
    'typescript/no-namespace': 'error',
    'typescript/no-non-null-asserted-optional-chain': 'error',
    'typescript/no-require-imports': 'error',
    'typescript/no-this-alias': 'error',
    'typescript/no-unnecessary-type-constraint': 'error',
    'typescript/no-unsafe-declaration-merging': 'error',
    'typescript/no-unsafe-function-type': 'error',
    'typescript/no-unused-vars': 'error',
    'typescript/no-wrapper-object-types': 'error',
    'typescript/prefer-as-const': 'error',
    'typescript/prefer-namespace-keyword': 'error',
    'typescript/triple-slash-reference': 'error',

    // Import rules
    'import/no-anonymous-default-export': 'warn',

    // JSX a11y rules (matching previous config)
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',

    // Disabled rules
    'jsx-a11y/no-autofocus': 'off', // autoFocus is intentionally used in the search modal

    // Next.js rules (all previously active @next/next rules)
    'nextjs/google-font-display': 'warn',
    'nextjs/google-font-preconnect': 'warn',
    'nextjs/inline-script-id': 'error',
    'nextjs/next-script-for-ga': 'warn',
    'nextjs/no-assign-module-variable': 'error',
    'nextjs/no-async-client-component': 'warn',
    'nextjs/no-before-interactive-script-outside-document': 'warn',
    'nextjs/no-css-tags': 'warn',
    'nextjs/no-document-import-in-page': 'error',
    'nextjs/no-duplicate-head': 'error',
    'nextjs/no-head-element': 'warn',
    'nextjs/no-head-import-in-document': 'error',
    'nextjs/no-html-link-for-pages': 'error',
    'nextjs/no-img-element': 'warn',
    'nextjs/no-page-custom-font': 'warn',
    'nextjs/no-script-component-in-head': 'error',
    'nextjs/no-styled-jsx-in-document': 'warn',
    'nextjs/no-sync-scripts': 'error',
    'nextjs/no-title-in-document-head': 'warn',
    'nextjs/no-typos': 'warn',
    'nextjs/no-unwanted-polyfillio': 'warn',
  },
  ignorePatterns: [
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.tmp',
    '**/.git',
    '**/.yarn/**',
    '**/dist/**',
    '**/node_modules',
    '**/temp',
    'coverage/**',
    '**/archived/**',
    'tmp/**',
    'vitest.config.ts',
    'vitest.setup.ts',
  ],
})
