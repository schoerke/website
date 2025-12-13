import '@testing-library/jest-dom/vitest'

// Set up required environment variables for tests
// Only set if not already defined (allows .env to take precedence)
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-secret-key'
process.env.DATABASE_URI = process.env.DATABASE_URI || 'file:./test.db'
process.env.NEXT_PUBLIC_S3_HOSTNAME = process.env.NEXT_PUBLIC_S3_HOSTNAME || 'https://example.r2.dev'
