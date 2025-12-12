# Testing Guide

This document outlines testing patterns, conventions, and best practices for this Next.js/Payload CMS project.

## Table of Contents

- [Overview](#overview)
- [Test Statistics](#test-statistics)
- [Test File Organization](#test-file-organization)
- [Testing Patterns](#testing-patterns)
- [Mock Data Patterns](#mock-data-patterns)
- [Type Casting in Tests](#type-casting-in-tests)
- [Coverage Strategy](#coverage-strategy)
- [Running Tests](#running-tests)

## Overview

This project uses **Vitest** for unit and integration testing, achieving 95%+ coverage on all critical business logic.

**Philosophy:**

- Test business logic thoroughly, not framework configuration
- Focus on behavior and contracts, not implementation details
- Use meaningful assertions that verify real-world scenarios
- Keep tests maintainable and easy to understand

## Test Statistics

- **38 test files**
- **715 tests**
- **95.12%** statement coverage
- **95.96%** line coverage
- **100% coverage** on critical business logic:
  - Access control functions
  - Service layer
  - Validators
  - Search utilities
  - Helper functions

## Test File Organization

```
src/
├── __tests__/           # Shared test utilities (this directory)
│   └── README.md        # This file
├── access/
│   ├── authenticated.ts
│   └── authenticated.spec.ts
├── services/
│   ├── __test-utils__/
│   │   └── payloadMocks.ts    # Mock data factories
│   ├── post.ts
│   └── post.spec.ts
└── [feature]/
    ├── [module].ts
    └── [module].spec.ts
```

**Conventions:**

- Test files use `.spec.ts` extension (consistent with Angular/NestJS)
- Tests are co-located with source files
- Shared mocks and utilities in `__test-utils__/` directories

## Testing Patterns

### 1. Arrange-Act-Assert Pattern

All tests follow the AAA pattern for clarity:

```typescript
it('should fetch posts with specified locale', async () => {
  // ARRANGE - Set up test data and mocks
  vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

  // ACT - Execute the function under test
  await getAllPosts('en')

  // ASSERT - Verify the results
  expect(mockPayload.find).toHaveBeenCalledWith({
    collection: 'posts',
    locale: 'en',
    limit: 0,
  })
})
```

### 2. Descriptive Test Names

Test names should read like specifications:

```typescript
describe('when user is authenticated', () => {
  it('returns true for authenticated user object')
  it('returns true even if user has minimal properties')
})

describe('when user is not authenticated', () => {
  it('returns published status constraint when user is undefined')
  it('returns published status constraint when user is null')
})
```

### 3. Nested Describe Blocks

Organize tests by scenario or feature:

```typescript
describe('getFilteredPosts', () => {
  describe('filtering', () => {
    it('should filter by single category')
    it('should filter by multiple categories')
    it('should filter by artist ID')
  })

  describe('search', () => {
    it('should filter by search text when search is 3+ characters')
    it('should not filter when search is less than 3 characters')
  })

  describe('pagination', () => {
    it('should respect custom limit')
    it('should use default limit when not specified')
  })
})
```

### 4. Mock Setup in beforeEach

Keep test state clean with beforeEach:

```typescript
describe('Post Service', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    // Fresh mock for each test
    mockPayload = {
      find: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as Payload

    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
  })

  // All tests use clean mock state
})
```

### 5. Testing Edge Cases

Always test boundary conditions and edge cases:

```typescript
describe('edge cases', () => {
  it('returns null when post is not found')
  it('handles empty array results')
  it('handles malformed input gracefully')
  it('returns true for empty user object (truthy in JavaScript)')
})
```

### 6. Negative Assertions

Test what should NOT happen:

```typescript
it('should not filter by search text when search is less than 3 characters', async () => {
  await getFilteredPosts({ search: 'ab' })

  expect(mockPayload.find).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.not.objectContaining({
        or: expect.anything(),
      }),
    }),
  )
})
```

## Mock Data Patterns

### Using Mock Factories

Create reusable mock data with factory functions in `__test-utils__/`:

```typescript
// src/services/__test-utils__/payloadMocks.ts

/**
 * Creates a mock Post object for testing.
 * @param overrides - Partial Post object to override defaults
 */
export function createMockPost(overrides?: Partial<Post>): Post {
  return {
    id: '1',
    title: 'Test Post',
    slug: 'test-post',
    categories: ['news'],
    published: true,
    _status: 'published',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides, // Override any properties
  } as Post
}
```

**Usage:**

```typescript
// Create with defaults
const post = createMockPost()

// Override specific properties
const draftPost = createMockPost({
  _status: 'draft',
  published: false,
})

// Create multiple with different data
const posts = [createMockPost({ id: '1', title: 'First Post' }), createMockPost({ id: '2', title: 'Second Post' })]
```

### Mocking Payload API

```typescript
import { vi } from 'vitest'
import type { Payload } from 'payload'

// Mock getPayload at module level
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn(),
  }
})

// In beforeEach
beforeEach(async () => {
  mockPayload = {
    find: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as Payload

  const { getPayload } = await import('payload')
  vi.mocked(getPayload).mockResolvedValue(mockPayload)
})

// In test
vi.mocked(mockPayload.find).mockResolvedValue({
  docs: [createMockPost()],
  totalDocs: 1,
  limit: 10,
  totalPages: 1,
  page: 1,
  pagingCounter: 1,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: null,
  nextPage: null,
})
```

## Type Casting in Tests

### When to Use `as unknown as T`

Payload CMS types are complex and include many internal properties. For testing, we often need minimal objects.

**✅ Correct Pattern:**

```typescript
const args = {
  req: {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      updatedAt: '2025-01-01T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    } as unknown as User,
  },
} as unknown as AccessArgs<User>
```

**Why two-step cast (`as unknown as T`):**

1. **Direct cast fails**: TypeScript won't allow `{ req: { user: mockUser } } as AccessArgs<User>` because `AccessArgs`
   requires many properties (transaction context, locale, internal state, etc.)

2. **`as unknown as T` is explicit**: It clearly signals "I know this is incomplete, but it's sufficient for this test"

3. **Better than `any`**: We maintain type checking on the mock data itself (User properties are validated)

4. **Project policy alignment**: From AGENTS.md - "For test data with intentionally missing fields, use empty strings or
   create proper partial types"

**When NOT to use it:**

```typescript
// ❌ DON'T use for simple types
const id = '123' as unknown as string // Unnecessary

// ❌ DON'T use to bypass real type errors
const result = someFunction() as unknown as ExpectedType // Fix the function instead

// ✅ DO use for complex framework types in tests
const args = mockData as unknown as PayloadFrameworkType
```

### Alternative Approaches (and why we don't use them)

**Option 1: Create full objects**

```typescript
// ❌ Too verbose - 100+ properties for AccessArgs
const args: AccessArgs<User> = {
  req: {
    user: mockUser,
    payload: mockPayload,
    locale: 'en',
    fallbackLocale: 'de',
    transactionID: undefined,
    context: {},
    headers: new Map(),
    // ... 50+ more properties
  },
}
```

**Option 2: Use `Partial<T>`**

```typescript
// ❌ Would require changing function signatures
function authenticated(args: Partial<AccessArgs<User>>) // Can't do this
```

**Option 3: Use `any`**

```typescript
// ❌ Violates project policy (AGENTS.md: "NEVER use any type")
const args = mockData as any
```

**✅ Our approach: `as unknown as T` in tests only**

- Pragmatic for complex framework types
- Contained to test files
- Clear intent
- Maintains type safety on mock data

## Coverage Strategy

### What We Cover

**100% Coverage:**

- Access control functions (authentication, authorization)
- Service layer (data access, business logic)
- Validators (field validation, URL validation, quote validation)
- Search utilities (text normalization, stopwords, hooks)
- Helper functions (slug generation, image handling, pagination)

**Excluded from Coverage:**

- Collections (`src/collections/**`) - Declarative Payload CMS configuration

### Why Collections Are Excluded

Collection files are 90% declarative JSON-like configuration objects:

```typescript
// Example: Posts.ts
export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    create: authenticated, // ✅ Tested in authenticated.spec.ts
    read: authenticatedOrPublished, // ✅ Tested in authenticatedOrPublished.spec.ts
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    // ... 20+ more field definitions
  ],
}
```

**Testing collections would mean:**

- ❌ Asserting property values (`expect(Posts.slug).toBe('posts')`) - no value
- ❌ Duplicating TypeScript's type checking
- ❌ Testing Payload CMS framework itself, not our code
- ❌ Creating brittle tests that break on config changes

**The actual logic IS tested:**

- `authenticated` function → `authenticated.spec.ts`
- `normalizeText` function → `normalizeText.spec.ts`
- `createSlugHook` function → `slug.spec.ts`

**Result**: Focus on testing business logic, not configuration syntax.

See `vitest.config.ts` for coverage exclusion configuration.

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/services/post.spec.ts

# Run tests matching pattern
pnpm test post
```

### Coverage Reports

After running `pnpm test:coverage`:

- **Terminal**: Summary table with percentages
- **HTML Report**: `coverage/index.html` (detailed, visual)
- **JSON Report**: `coverage/coverage-final.json` (CI/CD integration)

### CI/CD Integration

Tests run automatically on:

- Pull requests
- Pushes to main branch
- Pre-commit hooks (via Husky, if configured)

## Best Practices Summary

1. **✅ DO**: Test behavior and contracts, not implementation details
2. **✅ DO**: Use descriptive test names that read like specifications
3. **✅ DO**: Test edge cases and boundary conditions
4. **✅ DO**: Use factory functions for mock data
5. **✅ DO**: Use `as unknown as T` for complex Payload types in tests
6. **✅ DO**: Organize tests with nested `describe` blocks
7. **✅ DO**: Write negative assertions (test what should NOT happen)
8. **✅ DO**: Keep tests focused and independent

9. **❌ DON'T**: Test framework configuration files
10. **❌ DON'T**: Use `any` type (violates project policy)
11. **❌ DON'T**: Create brittle tests tied to implementation details
12. **❌ DON'T**: Skip edge case testing
13. **❌ DON'T**: Write tests that depend on other tests' state

## Common Patterns Cheat Sheet

### Testing Payload Services

```typescript
describe('Service Function', () => {
  let mockPayload: Payload

  beforeEach(async () => {
    mockPayload = {
      find: vi.fn(),
    } as unknown as Payload

    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue(mockPayload)
  })

  it('should call payload.find with correct query', async () => {
    vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

    await serviceFunction({ locale: 'en' })

    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'posts',
      locale: 'en',
      depth: 1,
    })
  })
})
```

### Testing Access Control

```typescript
describe('Access Control Function', () => {
  it('should return true for authenticated user', () => {
    const args = {
      req: {
        user: {
          id: '123',
          email: 'user@example.com',
          name: 'Test User',
          updatedAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
        } as unknown as User,
      },
    } as unknown as AccessArgs<User>

    expect(accessFunction(args)).toBe(true)
  })
})
```

### Testing Search/Filter Functions

```typescript
describe('Filter Function', () => {
  it('should apply filter when value is provided', () => {
    const result = filterFunction({ search: 'test' })

    expect(result).toHaveProperty('where.or')
    expect(result.where.or).toContainEqual({
      normalizedTitle: { contains: expect.any(String) },
    })
  })

  it('should not apply filter when value is missing', () => {
    const result = filterFunction({})

    expect(result).not.toHaveProperty('where.or')
  })
})
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- Project: `docs/server-actions-pattern.md` - Data fetching patterns
- Project: `AGENTS.md` - Code style guidelines

## Questions?

If you have questions about testing patterns or need help writing tests:

1. Review this guide and existing test files
2. Check the `__test-utils__/` directories for mock factories
3. Look at similar tests in the same directory
4. Consult the code review in git history for patterns

---

**Last Updated**: 2025-12-11  
**Coverage**: 95.12% statements, 95.96% lines  
**Tests**: 715 tests across 38 files
