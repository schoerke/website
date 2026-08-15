## React Component Pattern

**CRITICAL: This is the standard pattern for ALL React components in this project.**

### Required Component Structure

```typescript
'use client' // Only if client component (place at TOP of file, before imports)

import statements...

interface ComponentNameProps {
  prop1: Type1
  prop2?: Type2 // Optional props marked with ?
}

const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    // JSX
  )
}

export default ComponentName
```

### Key Rules

1. **Import Placement:**
   - **ALWAYS place imports at the very top of the file**, immediately after `'use client'` if present
   - `'use client'` must be the very first line when needed — before all imports
   - This is a critical rule for code organization

2. **Component Declaration:**
   - Client components and sync server components: `const ComponentName: React.FC<PropsType> = (props) => { ... }`
   - Async server components (data-fetching): `const ComponentName = async (props: PropsType) => { ... }`
   - Never use function declarations: `function ComponentName() { ... }`
   - Never export inline: `export const ComponentName = ...`
   - Note: `React.FC` cannot be used with `async` components — omit it and type props inline or via interface

3. **Props Interface:**
   - Always define a named interface: `ComponentNameProps`
   - Place it directly above the component declaration
   - Use descriptive names that match the component name

4. **Export Pattern:**
   - Always use default export: `export default ComponentName`
   - Place export at the end of the file (after component definition)
   - **Exception:** Files with multiple related components (e.g., tab components, form sections) may use named exports
     when consumed together

5. **Helper Functions:**
   - Define helper functions outside the component (above it)
   - Add return type annotations: `function helper(x: number): string { ... }`
   - Use `function` keyword for top-level helpers, not arrow functions

6. **Client vs Server:**
   - Add `'use client'` directive only when necessary (hooks, event handlers, browser APIs)
   - Place `'use client'` at the very top of the file, before all imports
   - Server components are the default (no directive needed)

### Examples

**✅ CORRECT - Client Component:**

```typescript
'use client'

import { useState } from 'react'

interface CounterProps {
  initialValue?: number
}

const Counter: React.FC<CounterProps> = ({ initialValue = 0 }) => {
  const [count, setCount] = useState(initialValue)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}

export default Counter
```

**✅ CORRECT - Server Component with Helper:**

```typescript
import { Post } from '@/payload-types'

interface PostListProps {
  posts: Post[]
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

const PostList: React.FC<PostListProps> = ({ posts }) => {
  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          <h2>{post.title}</h2>
          <time>{formatDate(post.createdAt)}</time>
        </div>
      ))}
    </div>
  )
}

export default PostList
```

**❌ WRONG - Function Declaration:**

```typescript
// DON'T DO THIS
export function ComponentName(props: Props) {
  return <div>...</div>
}
```

**❌ WRONG - Inline Named Export:**

```typescript
// DON'T DO THIS
export const ComponentName: React.FC<Props> = (props) => {
  return <div>...</div>
}
```

**❌ WRONG - Export Before Definition:**

```typescript
// DON'T DO THIS
export default ComponentName

const ComponentName: React.FC<Props> = (props) => {
  return <div>...</div>
}
```

### Compound Component Pattern

For components that use the compound pattern (like `NewsFeed.Server`, `NewsFeed.Client`):

**File: `NewsFeedServer.tsx`**

```typescript
const NewsFeedServer: React.FC<NewsFeedServerProps> = (props) => {
  // ...
}

export default NewsFeedServer
```

**File: `index.tsx`**

```typescript
import NewsFeedServer from './NewsFeedServer'
import NewsFeedClient from './NewsFeedClient'

const NewsFeed = {
  Server: NewsFeedServer,
  Client: NewsFeedClient,
}

export { NewsFeed }
export default NewsFeed
```

### Multi-Component Files (Exception)

For files containing multiple related components that are consumed together (like tab content):

**File: `ArtistTabContent.tsx`**

```typescript
'use client'

// Biography Tab
interface BiographyTabProps {
  content: Artist['biography']
  quote?: string | null
}

export const BiographyTab: React.FC<BiographyTabProps> = ({ content, quote }) => {
  return <div className="prose">{/* ... */}</div>
}

// Repertoire Tab
interface RepertoireTabProps {
  repertoires: Repertoire[]
}

export const RepertoireTab: React.FC<RepertoireTabProps> = ({ repertoires }) => {
  return <div>{/* ... */}</div>
}

// More tab components...
```

**Usage:**

```typescript
import { BiographyTab, RepertoireTab } from './ArtistTabContent'

// Use multiple components together
<BiographyTab content={artist.biography} />
<RepertoireTab repertoires={repertoires} />
```

**When to use multi-component files:**

- Components are closely related (e.g., tabs, form sections, card variants)
- Always consumed together in the same parent component
- Sharing types or helper functions specific to that domain
- **Not** for general utility components or unrelated components

### When to Deviate
