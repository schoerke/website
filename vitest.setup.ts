import '@testing-library/jest-dom/vitest'

// Set up required environment variables for tests
// Only set if not already defined (allows .env to take precedence)
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-secret-key'
process.env.DATABASE_URI = process.env.DATABASE_URI || 'file:./test.db'
process.env.DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || 'test-auth-token'
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_test1234567890_abcdefghijklmnopqrstuvwxyz'
process.env.NEXT_PUBLIC_S3_HOSTNAME = process.env.NEXT_PUBLIC_S3_HOSTNAME || 'https://example.r2.dev'
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'test@example.com'

// Suppress happy-dom warnings for valid HTML5 elements not yet supported in its browser simulation
// Suppress Next.js Image "fill" warnings in tests — parent element has no position/height in jsdom
const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('is unrecognized in this browser')) return
  if (typeof args[0] === 'string' && args[0].includes('has "fill"')) return
  originalConsoleError(...args)
}

// Next.js Image "fill" warnings also come through console.warn via warnOnce
const originalConsoleWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('has "fill"')) return
  originalConsoleWarn(...args)
}

// Suppress revalidation hook logs — noisy in test output, not test-relevant
const originalConsoleLog = console.log
console.log = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('[revalidate]')) return
  originalConsoleLog(...args)
}

// Mock next-intl navigation Link as simple anchor
import React from 'react'
import { vi } from 'vitest'
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('a', { href, ...props }, children),
}))
