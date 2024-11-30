import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import eslintConfigPrettier from 'eslint-config-prettier'
import perfectionist from 'eslint-plugin-perfectionist'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  eslintConfigPrettier,
  perfectionist.configs['recommended-alphabetical'],
  ...compat.extends('next/core-web-vitals'),
  {
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: '/Users/scott/code/production/schoerke/ksschoerke',
      },
    },
  },
  {
    plugins: {
      'typescript-eslint': typescriptEslint,
    },
  },
  {
    ignores: [
      '.tmp',
      '**/.git',
      '**/.hg',
      '**/.pnp.*',
      '**/.svn',
      '**/.yarn/**',
      '**/build',
      '**/dist/**',
      '**/node_modules',
      '**/temp',
      'playwright.config.ts',
      'jest.config.js',
    ],
  },
]
