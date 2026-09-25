# Schoerke Website: E2E Testing Workflow Analysis

## Overview

The Schoerke website is a Next.js + Payload CMS application with:
- **Public frontend** (artists, news, projects, contact pages with search/filters)
- **Headless Payload CMS admin** (content management, media uploads, publishing)
- **Multi-locale support** (German & English with content-aware locale switching)
- **Complex data relationships** (artists ↔ repertoires, posts ↔ images, contact persons ↔ employees)
- **Server-side pagination** (news/projects with search and filtering)
- **Real-time content revalidation** (hooks trigger ISR on publish)

Current test coverage is mostly **unit tests** (Vitest) on services, hooks, and components. **E2E testing is non-existent** (empty `e2e/` folder).

---

## CRITICAL WORKFLOWS FOR E2E TESTING

### Category A: PUBLIC USER FLOWS (Frontend)

#### 1. **Homepage → News Carousel → Detail Page Navigation**
**Priority: CRITICAL** | **Complexity: HIGH** | **Risk: HIGH**

**What users do:**
1. Load homepage
2. Browse news/projects carousel (manual navigation between slides)
3. Click on a featured post
4. Land on news detail page with full post content
5. Navigate back or explore related posts

**Why it matters:**
- Homepage carousel is the **entry point** for content discovery
- Complex client-side carousel state (embla-carousel with autoplay)
- Image focal point handling (focalX/focalY on posts)
- ISR revalidation on post publish affects visibility
- Post visibility depends on `_status: published` + proper `publishedDate`

**Current coverage:** None. Unit tests exist for carousel logic, but no E2E.

**Key aspects to test:**
- Carousel auto-rotates
- Manual slide navigation (prev/next)
- Click-to-detail works
- Images load with correct focal point
- Pagination on detail page works if post has related items
- Back navigation preserves carousel state

---

#### 2. **Artist Browse → Filter by Instrument → View Artist Detail → Contact Persons**
**Priority: CRITICAL** | **Complexity: HIGH** | **Risk: HIGH**

**What users do:**
1. Navigate to `/artists` page
2. See grid of all artists (sorted by instrument priority, then alphabetically)
3. Click instrument filter tab (e.g., "Violin")
4. Grid re-filters in real-time
5. Click artist card → detail page
6. View artist biography, repertoire, recordings, galleries
7. See contact persons with email links
8. Click email link

**Why it matters:**
- **Complex sorting logic**: instrument priority + last-name alphabetical sort (chamber ensembles sort by ensemble name)
- **Stateful client filtering**: instrument selection persists across rerenders
- **Artist detail page** is heavily parameterized:
  - Localized slugs (different per locale)
  - Populated relationships (repertoire content, recordings, images, contact persons)
  - Conditional rendering (hide tabs if no data)
  - Focal point image handling on artist image
- **Contact person link** is interaction point (email, phone)
- **Relationship integrity**: contact persons must be valid Employee objects

**Current coverage:** 
- Unit tests for `ArtistGrid` sorting/filtering logic
- Unit tests for `getArtistBySlug` service
- No E2E for full flow

**Key aspects to test:**
- All artists load on first visit
- Instrument filter applies and clears correctly
- Filtered grid shows only matching artists
- Click artist → detail page loads (slug resolution correct)
- All tabs present if data exists
- Contact persons show emails (not just IDs)
- Gallery images load with focal points
- Locale switch on artist detail resolves to correct artist in other locale

---

#### 3. **News/Projects List → Search & Pagination → View Post Detail**
**Priority: HIGH** | **Complexity: MEDIUM** | **Risk: HIGH**

**What users do:**
1. Navigate to `/news` or `/projects`
2. See paginated list (10 items per page by default)
3. Type in search box (searches title field, min 3 chars)
4. Results filter in real-time
5. Click to view full post
6. Return to list (pagination/search state preserved)

**Why it matters:**
- **Server-side pagination** with client-side search integration
- **Invalid page numbers** trigger redirect to last valid page
- **Search validation**: minimum 3 characters, normalized for diacritics
- **Dynamic category filtering**: posts marked with `categories: ['news']` or `['projects']` or both
- **Publishing status**: only published posts show (`_status: published` + `publishedDate` in past)
- **Post content validation**: complex Lexical editor content must pass validation before publish

**Current coverage:**
- Unit tests for pagination parsing and redirect logic
- Unit tests for search normalization
- No E2E for full search+pagination flow

**Key aspects to test:**
- Empty search shows all items
- Search with 1-2 chars shows no results (validation)
- Search with 3+ chars filters correctly
- Pagination next/prev/go-to-page works
- Invalid page number redirects to last page
- Click post → detail page loads
- Back to list preserves search query and page number
- Categories filter correctly (news vs projects)

---

#### 4. **Locale Switching → Content & URL Preservation**
**Priority: HIGH** | **Complexity: MEDIUM** | **Risk: HIGH**

**What users do:**
1. Browse site in German (default locale)
2. Click locale switcher (DE / EN toggle) in header
3. Current page translates to English
4. **On localized slug routes** (artist, news, project detail), slug translates to target locale
5. All navigation links update to English URLs
6. Switch back to German

**Why it matters:**
- **Slug resolution**: `/de/news/concert-wien` → `/en/news/concert-in-vienna` must map to same post
- **Server action** (`resolvePostSlugInLocale`) fetches cross-locale slug mapping
- **Hash preservation**: if viewing artist at `#repertoire`, hash stays on switch
- **Content duplication risk**: if slug differs between locales but maps to same post, both should work
- **Navigation consistency**: all links must update to target locale

**Current coverage:**
- Unit tests for `LocaleSwitcher` component
- Unit tests for `resolvePostSlugInLocale` action
- No E2E for full locale switch flow with navigation

**Key aspects to test:**
- Locale button visible and clickable
- Click DE/EN toggle switches to other locale
- Homepage (no slug) navigates to `/en/` or `/de/`
- Artist detail slug resolves to target locale artist slug
- News/project detail slug resolves to target locale post slug
- Hash fragment preserved on switch
- All header nav links update to target locale
- Screen reader announcement fires on switch

---

### Category B: ADMIN WORKFLOWS (Payload CMS)

#### 5. **Publish Post → ISR Revalidation → Frontend Visibility**
**Priority: CRITICAL** | **Complexity: HIGH** | **Risk: CRITICAL**

**What admins do:**
1. Navigate to Payload admin (`/admin/` route)
2. Log in (if not already authenticated)
3. Open Posts collection
4. Click "Create" or edit existing post
5. Fill in title, content (Lexical editor with blocks), categories, artist links, image
6. Set `publishedDate` to today or past
7. Set `_status` to "published" (or save as draft)
8. Click Save
9. **Hooks fire**: `afterChange` triggers revalidation (`revalidatePostOnChange`)
10. ISR revalidation tags `home`, `news`, `projects` pages
11. Next request to affected pages gets fresh content from DB
12. Return to frontend → post now visible

**Why it matters:**
- **Publishing is critical business flow**: artists depend on news/projects visibility for bookings
- **Status + publishedDate validation**: only `_status: published` AND `publishedDate ≤ now` should show
- **Lexical editor validation**: complex content validation (blocks, nesting, format constraints)
- **Relationship linkage**: must link image, artist references, category select
- **Revalidation hooks**: If hooks fail, frontend won't update (stale cache)
- **Draft vs Published**: must be able to save drafts without publishing
- **Version control**: Payload versions table must track draft versions (5 max per doc)

**Current coverage:**
- Unit tests for `validatePublishedPostContent` hook
- Unit tests for `setPublishedDate` hook
- Unit tests for `revalidatePostOnChange` hook
- No E2E for full create-edit-publish-visibility flow

**Key aspects to test:**
- Admin login works (auth required)
- Create new post form loads
- Fill all required fields (title, content, image, categories)
- Save post as draft → post appears in admin list, not frontend
- Edit draft: change title, save again
- Publish draft: set `_status: published`, save
- Wait for ISR revalidation
- Frontend page loads → post visible
- Edit published post: change content
- Frontend page loads → new content visible (no cache stale)
- Unpublish post: set `_status: draft`
- Frontend page loads → post disappears

---

#### 6. **Upload Image → Link to Artist Biography → Validate Focal Points**
**Priority: HIGH** | **Complexity: MEDIUM** | **Risk: HIGH**

**What admins do:**
1. Open Artist collection in Payload admin
2. Click "Create Artist" or edit existing
3. Upload artist image:
   - Drag/drop or click upload button
   - Select file from computer
   - Image resizes/generates thumbnail
4. Set focal point (visual crop guide) on artist image
5. Fill biography text using Lexical editor
6. Add gallery images (array field with image relationships)
7. Save artist
8. Frontend: artist detail page loads
9. Artist image displays with correct focal point (crop/zoom)
10. Gallery images display with focal points

**Why it matters:**
- **File upload validation**: max file size limits, MIME type checks
- **Image processing**: thumbnail generation (400x300, WebP format)
- **Focal point persistence**: `focalX` and `focalY` values must be stored and used on frontend
- **Relationship integrity**: gallery images are relationship references (not file uploads)
- **Frontend rendering**: `objectPosition` CSS style depends on focal points
- **Error states**: network failures, oversized files, invalid formats must be handled

**Current coverage:**
- Unit tests for `limitImageFileSize` hook
- Unit tests for image URL generation
- No E2E for upload+focal-point flow

**Key aspects to test:**
- Upload button visible in artist form
- Select image file from filesystem
- Upload completes (shows thumbnail)
- Focal point editor appears on uploaded image
- Click/drag to set focal point coordinates
- Save artist form
- Go to frontend → artist detail page
- Artist image displays with correct crop (focal point applied)
- Gallery images load in grid with focal points

---

#### 7. **Manage Artist Contact Persons → Link Employees → Sync to Posts**
**Priority: MEDIUM** | **Complexity: MEDIUM** | **Risk: MEDIUM**

**What admins do:**
1. Open Artist detail in Payload admin
2. Scroll to "Contact Persons" relationship field
3. Click "Add" → select Employee(s) from modal
4. Save artist
5. Artist detail page shows contact persons with email/phone
6. In Posts collection, link posts to artists
7. Frontend: artist detail shows projects/news linked to them
8. Posts show artist contact persons

**Why it matters:**
- **Bidirectional relationships**: Artist ↔ Contact Persons (Employees), Artist ↔ Projects/News (Posts)
- **Data consistency**: if employee is deleted, artist contact persons must be cleaned up
- **Relationship field maxRows validation**: must respect max contact persons limit
- **Reverse relationship**: posts linked to artist should appear on artist detail (projects/news tabs)
- **Population depth**: relationships must be populated correctly (`depth: 1` or deeper)
- **Admin relationship chips**: clicking ✕ removes relationship optimistically (before save)

**Current coverage:**
- Unit tests for relationship field validation
- No E2E for relationship management flow

**Key aspects to test:**
- Open artist without contact persons
- Click "Add" in Contact Persons field
- Employee modal opens with list of employees
- Search employee by name
- Select employee(s)
- Modal closes, employee appears in relationship array
- Click ✕ on employee chip → optimistically removed from array
- Save artist
- Admin list shows updated contact persons count
- Frontend: artist detail shows contact person with email link
- Click email link → opens mail client with email pre-filled

---

#### 8. **Create Post with Rich Text Blocks (Performers, Events, Videos) → Admin Preview → Live**
**Priority: MEDIUM** | **Complexity: HIGH** | **Risk: MEDIUM**

**What admins do:**
1. Open Posts collection
2. Create new post
3. Add Lexical rich text content with blocks:
   - Text paragraphs
   - Performers List block (artist relationships)
   - Event Dates block (formatted dates)
   - Video Embed block (YouTube/Vimeo URL or embed code)
   - Audio Embed block (Spotify/SoundCloud)
4. Add layout features (alignment, formatting)
5. Click "Preview" button → live preview in modal
6. Verify layout, relationships resolve correctly
7. Publish post
8. Frontend: post detail loads
9. All blocks render correctly with populated data

**Why it matters:**
- **Complex block validation**: each block has custom validation rules
- **Preview feature**: must populate relationships at preview time (via `getPayload().find()`)
- **Rich text sanitization**: prevents XSS, validates block structure
- **Block conversion features**: EventDatesConverter, PerformersListConverter auto-populate from legacy content
- **Accessibility**: block content must render with proper ARIA labels
- **Performance**: block rendering (esp. Performers List with images) must not be slow

**Current coverage:**
- Unit tests for block validators
- Unit tests for block parsers/converters
- No E2E for block creation+preview+publish flow

**Key aspects to test:**
- Block toolbar appears in Lexical editor
- Add PerformersList block
- Search and select artist(s) in block
- Populate block with artist relationships
- Add EventDates block
- Enter date range
- Add VideoEmbed block with YouTube URL
- Preview button visible
- Click preview → modal opens
- All blocks render in preview
- Artists show images, event dates format correctly
- Video embeds as iframe
- Close preview, publish post
- Frontend: post detail loads
- Scroll through post → all blocks render correctly

---

## PRIORITIZED E2E TEST SUITE RECOMMENDATIONS

### Tier 1: CRITICAL (Must Test First)

| Workflow | Type | Reason | Est. Duration |
|----------|------|--------|----------------|
| **#1: Homepage Carousel → News Detail** | User | Main entry point, high complexity | 8-10 min |
| **#2: Artist Browse & Filter** | User | Core product feature, complex sorting | 10-12 min |
| **#5: Publish Post → Frontend Visibility** | Admin | Critical CMS workflow, ISR dependency | 12-15 min |

**Rationale:** These three directly impact business operations. Homepage drives traffic. Artist browsing is primary service. Publishing directly affects whether content goes live.

---

### Tier 2: HIGH (Should Test ASAP)

| Workflow | Type | Reason | Est. Duration |
|----------|------|--------|----------------|
| **#3: News List Search & Pagination** | User | Common user action, easy to break | 8-10 min |
| **#4: Locale Switching** | User | Multi-locale complexity, cross-locale slug resolution | 8-10 min |
| **#6: Image Upload & Focal Points** | Admin | File handling, visual rendering critical | 10-12 min |

**Rationale:** These are frequent operations. Locale switching and search are common UX patterns. Image upload is essential for content.

---

### Tier 3: MEDIUM (Test After Tier 1 & 2)

| Workflow | Type | Reason | Est. Duration |
|----------|------|--------|----------------|
| **#7: Manage Contact Persons** | Admin | Relationship management, lower risk | 8-10 min |
| **#8: Rich Text Blocks** | Admin | Complex but specialist feature | 12-15 min |

**Rationale:** Solid to have, but lower failure rate. Block features are advanced; relationship mgmt is straightforward.

---

## TECHNICAL SETUP CHECKLIST

### Playwright Configuration
```bash
# Install Playwright
pnpm add -D @playwright/test

# Create playwright.config.ts
# Base URL: http://localhost:3000
# Timeout: 30s per test
# Retry: 1 on CI
# Headless: true on CI, false local
# Screenshot on failure
```

### Test Data / Fixtures
- **Admin user** (credentials in .env.test)
- **Seed data** (artists, posts, images in test DB)
- **Cleanup** (after each test, reset to known state or use transactional DB)

### Test Environment
- **Separate test DB**: `test.db` (already exists, check `.gitignore`)
- **Separate test admin**: unique test user in Payload
- **Dev server**: `pnpm dev` running on `localhost:3000`
- **Payload instance**: accessible at `http://localhost:3000/admin`

### Debugging
- **Save screenshots/videos** on failure (Playwright built-in)
- **Headed mode**: `playwright test --headed` for manual debugging
- **Debug mode**: `playwright test --debug` for step-through
- **Trace viewer**: `playwright show-trace trace.zip`

---

## RISK FACTORS & MITIGATIONS

### High-Risk Areas

| Risk | Mitigation |
|------|-----------|
| **Revalidation failures** (ISR not updating) | Mock revalidation in tests, verify cache tags |
| **Locale slug mismatches** | Pre-seed test data with cross-locale slugs verified |
| **Upload timeouts** | Use small test images, mock file system where safe |
| **Relationship cycles** (artist → post → artist) | Design test data to avoid cycles; validate on publish |
| **Lexical editor quirks** (block validation edge cases) | Use exact block structure from working examples |
| **Focal point coordinates** | Parameterize focal points; test extreme values (0, 50, 100) |

---

## ESTIMATED EFFORT

| Phase | Effort | Duration |
|-------|--------|----------|
| **Playwright setup + config** | 4-6 hours | 1 day |
| **Tier 1 test suite** (3 workflows) | 12-16 hours | 2-3 days |
| **Tier 2 test suite** (3 workflows) | 10-14 hours | 2-3 days |
| **Tier 3 test suite** (2 workflows) | 10-14 hours | 2-3 days |
| **CI/CD integration** | 4-6 hours | 1 day |
| **Total** | **40-56 hours** | **1-2 weeks** |

---

## NEXT STEPS

1. **Create `e2e/` test directory structure**
   ```
   e2e/
   ├── fixtures/
   │   ├── testData.ts
   │   └── auth.ts
   ├── tests/
   │   ├── 1-homepage.spec.ts
   │   ├── 2-artist-browse.spec.ts
   │   ├── 3-news-search.spec.ts
   │   ├── 4-locale-switching.spec.ts
   │   ├── 5-publish-post.spec.ts
   │   ├── 6-image-upload.spec.ts
   │   ├── 7-contact-persons.spec.ts
   │   └── 8-rich-text-blocks.spec.ts
   └── helpers/
       ├── navigation.ts
       ├── assertions.ts
       └── admin-actions.ts
   ```

2. **Define test data schema** (artists, posts, images, employees to seed)

3. **Write Playwright config** with base URL, auth, screenshots/traces

4. **Implement fixture for admin login** (reusable auth context)

5. **Start with Tier 1 tests** (homepage, artist, publish)

6. **Add CI job** to GitHub Actions (`.github/workflows/e2e.yml`)
