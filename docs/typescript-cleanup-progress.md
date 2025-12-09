# TypeScript Cleanup Progress

**Goal:** Remove all `any` types and fix all TypeScript/ESLint errors without using suppressions.

**Started:** 224 problems (205 errors, 19 warnings)  
**Current:** 188 problems (170 errors, 18 warnings)  
**Fixed:** 36 problems (35 errors, 1 warning)  
**All tests:** ✅ 203/203 passing  
**Build status:** ✅ Passing

---

## Critical Patterns to Follow

### 1. Always Use Payload Types (Not Custom Types)

❌ **WRONG - Creating custom types:**

```typescript
// ArtistGrid.tsx (OLD)
type Artist = {
  id: string
  name: string
  image?: Image | null
}
```

✅ **CORRECT - Use Payload types:**

```typescript
// ArtistGrid.tsx (NEW)
import type { Artist, Image } from '@/payload-types'

interface ArtistGridProps {
  artists: Artist[] // Use Payload's Artist type
}
```

**Why:** Payload types include all fields and handle relationship population correctly. Custom types cause mismatches.

---

### 2. Use `depth` Parameter to Populate Relationships

❌ **WRONG - Missing depth causes `image` to be a number:**

```typescript
await payload.find({
  collection: 'artists',
  // Missing depth!
})
// Result: artist.image is `number` (ID only)
```

✅ **CORRECT - Add depth to populate:**

```typescript
await payload.find({
  collection: 'artists',
  depth: 1, // Populates first level of relationships
})
// Result: artist.image is `Image` object with all fields
```

**Required in:**

- All service functions that return data with relationships
- Documented in AGENTS.md "Data Fetching Pattern" section

---

### 3. Use Type Guards for Payload Relationship Fields

Payload types have relationships as `number | Type | null` (could be ID or populated object).

✅ **CORRECT - Type guard pattern:**

```typescript
const image = typeof artist.image === 'object' ? artist.image : null
// Now TypeScript knows `image` is `Image | null`, not `number | Image | null`

// Use the narrowed type
const imageUrl = image?.url
const focalX = image?.focalX ?? null
```

**Alternative - Using type predicate:**

```typescript
function isMedia(value: unknown): value is Media {
  return typeof value === 'object' && value !== null && 'url' in value
}

if (isMedia(artist.image)) {
  // TypeScript knows it's Media here
  console.log(artist.image.url)
}
```

---

### 4. useSyncExternalStore: Cache Server Snapshot

When using `useSyncExternalStore`, the `getServerSnapshot` function must return a **cached constant object**, not create
a new object each call.

❌ **WRONG - Creates new object (causes infinite loop warning):**

```typescript
function getServerSnapshot() {
  return {
    // New object every call!
    value: false,
  }
}
```

✅ **CORRECT - Return cached constant:**

```typescript
const SERVER_SNAPSHOT = {
  value: false,
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT // Same object every time
}
```

**Why:** React uses object reference equality to detect changes. New objects cause re-renders.

---

### 5. React Component Pattern (Key prop for state reset)

❌ **WRONG - setState in useEffect:**

```typescript
useEffect(() => {
  setActiveTab(0) // BAD: causes react-hooks/exhaustive-deps issues
}, [locale])
```

✅ **CORRECT - Key prop pattern:**

```typescript
// Wrapper component
const ArtistTabs: React.FC<Props> = (props) => {
  return <ArtistTabsInner key={props.locale} {...props} />
}

// Inner component with state
const ArtistTabsInner: React.FC<Props> = (props) => {
  const [activeTab, setActiveTab] = useState(0)
  // State resets automatically when key changes!
}
```

**Pattern:** Split into wrapper + inner component, use `key` prop to reset state.

---

### 6. Dynamic Translation Keys (Type-safe)

❌ **WRONG - Using `any`:**

```typescript
t(instrument as any) // Bypasses type checking
```

✅ **CORRECT - Using Parameters<> utility:**

```typescript
t(instrument as Parameters<typeof t>[0])
// Type-safe: only allows valid translation keys
```

**Pattern:** `Parameters<typeof translationFunction>[0]` extracts the valid key union type.

---

### 7. Payload Hooks Must Use Official Types

❌ **WRONG - Manual parameter typing:**

```typescript
export function createSlugHook(sourceField: string) {
  return ({ data, operation, value, req }: {
    data?: Record<string, unknown>
    operation: string  // WRONG: should be string | undefined
    value?: string
  }) => { ... }
}
```

✅ **CORRECT - Import and use FieldHook type:**

```typescript
import { FieldHook } from 'payload'

export function createSlugHook(sourceField: string): FieldHook {
  return ({ data, operation, value, req }) => {
    // Payload handles all parameter types correctly
  }
}
```

---

### 8. Router Link Types (Internationalized Routing)

For **user-provided/dynamic URLs** (could be external):

```typescript
import Link from 'next/link'  // Regular Next.js Link

<Link href={userProvidedUrl}>...</Link>
```

For **known internal routes** (in routing config):

```typescript
import { Link } from '@/i18n/navigation'  // i18n Link

<Link href="/artists">...</Link>
```

---

## Files Fixed (Session 2025-12-09)

### ✅ Component Type Safety

- `src/components/ui/ImageSlider.tsx` - Fixed Link import, 'use client' placement
- `src/components/Artist/ArtistGrid.tsx` - **Used Payload Artist type, added type guards**
- `src/components/Artist/ArtistTabs.tsx` - Key prop pattern for state reset
- `src/components/NewsFeed/NewsFeedClient.tsx` - Key prop pattern
- `src/components/Artist/ArtistTabContent.tsx` - Changed `any[]` to `Recording[]`
- `src/components/Recording/*` - All changed `any` to `Recording` type

### ✅ Hooks

- `src/hooks/usePlatform.ts` - **Cached server snapshot for useSyncExternalStore**

### ✅ Service Layer

- `src/services/artist.ts` - Added `depth: 1` to populate relationships
- `src/services/artist.spec.ts` - Updated test expectations

### ✅ Page Components

- `src/app/(frontend)/[locale]/artists/page.tsx` - Used Payload Artist type with type assertion
- `src/app/(frontend)/[locale]/artists/[slug]/page.tsx` - Type guard for media
- `src/app/(frontend)/[locale]/news/page.tsx` - Fixed locale validation
- `src/app/(frontend)/[locale]/projects/page.tsx` - Fixed locale validation

### ✅ Utilities

- `src/utils/slug.ts` - Used Payload FieldHook type
- `src/utils/collection.ts` - Type guards for isEmployee

### ✅ Translation Components

- `src/components/Artist/InstrumentFilter.tsx` - Type-safe dynamic keys
- `src/components/Recording/RoleFilter.tsx` - Type-safe dynamic keys
- `src/components/Artist/ArtistCard.tsx` - Fixed types, proper Link usage
- `src/components/Footer/FooterInfo.tsx` - Type-safe routes

### ✅ Rich Text / Lexical

- `src/components/NewsFeed/NewsFeedList.tsx` - Proper node traversal types
- `src/components/ui/ClientRichText.tsx` - SerializedEditorState type

### ✅ Router/Navigation

- `src/components/ui/BackButton.tsx` - Parameters<> utility for router types

---

## Files Remaining (src/ directory only)

### Components with `any` types:

- `src/components/Search/SearchProvider.tsx` - **2 issues:**
  - Line 111: `router.replace(currentPath as any, { locale: newLocale })`
  - Lines 180, 253: setState in useEffect (needs key prop pattern)

### API Routes:

- `src/app/api/search/generate-index/route.ts`
- `src/app/api/search/route.ts`

### Collections:

- `src/collections/Artists.ts` - ✅ Fixed (slug hook)
- `src/collections/Recordings.ts`

### Services:

- `src/services/search.ts`

### Utils:

- `src/i18n/request.ts`
- `src/utils/search/beforeSyncHook.ts`
- `src/utils/search/extractLexicalText.ts`

### Test Files (lower priority):

- `src/app/api/search/route.spec.ts`
- `src/components/__test-utils__/*`
- Various `*.spec.tsx` files

---

## Key Learnings from This Session

1. **Payload types are the source of truth** - Never create custom types that duplicate Payload types
2. **`depth` parameter is critical** - Without it, relationships are IDs, not populated objects
3. **Type guards are necessary** - Payload relationships can be `number | Type | null`
4. **Key prop pattern > setState in useEffect** - React's recommended pattern for state reset
5. **useSyncExternalStore server snapshot must be cached** - Return same object reference to avoid infinite loops
6. **Use official library types** - Import `FieldHook` from Payload, `SerializedEditorState` from Lexical, etc.
7. **`Parameters<typeof fn>[0]`** - Clean way to extract parameter types for type-safe assertions

---

## Next Steps

1. Fix `SearchProvider.tsx` (2 issues: router type, useEffect pattern)
2. Fix API routes (search endpoints)
3. Fix `src/collections/Recordings.ts`
4. Fix search utils (`beforeSyncHook`, `extractLexicalText`)
5. Fix `i18n/request.ts`
6. Lower priority: Test file `any` types

---

## Commands

```bash
# Check progress
pnpm lint 2>&1 | tail -5

# See src/ errors only
pnpm lint 2>&1 | grep -E "^/Users/.*/website/src/" | head -30

# Run tests
pnpm test

# Build
pnpm build
```

---

## References

- **Component patterns:** `docs/AGENTS.md` (React Component Pattern section)
- **Data fetching:** `docs/server-actions-pattern.md`
- **Payload relationships:** Always use `depth` parameter when needed
- **Type safety:** Prefer type guards over `as` assertions
