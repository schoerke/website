import '@testing-library/jest-dom/vitest'

// Set up required environment variables for tests
process.env.PAYLOAD_SECRET = 'test-secret-key'
process.env.DATABASE_URI = 'mongodb://localhost:27017/test'
process.env.NEXT_PUBLIC_S3_HOSTNAME = 'https://example.r2.dev'
