# Adding Static Pages

This guide explains how to add new static pages (like legal pages, about pages, etc.) to the website.

## Overview

Static pages are managed through the **Pages collection** in Payload CMS. They support:
- Localized content (German and English)
- Rich text content (Lexical editor)
- Full-text search integration
- SEO-friendly localized URLs

## Steps to Add a New Page

### 1. Create the Page in Payload Admin

1. Log in to Payload Admin at `/admin`
2. Navigate to **Collections → Pages**
3. Click **Create New**
4. Fill in the fields:
   - **Title**: Page title (localized - add both DE and EN)
   - **Slug**: URL-friendly identifier (e.g., `about`, `contact`)
   - **Content**: Rich text content (localized)
5. Click **Save**

### 2. Add Localized Route Mappings

Edit `src/i18n/routing.ts` to add pathname mappings for both languages:

```typescript
export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  pathnames: {
    // ... existing routes
    '/about': {
      de: '/ueber-uns',
      en: '/about',
    },
    // Add your new route here
  },
})
```

### 3. Create Route Files

Create dedicated route files for each localized URL:

**For German route** (`src/app/(frontend)/[locale]/ueber-uns/page.tsx`):

```typescript
import PayloadRichText from '@/components/ui/PayloadRichText'
import { getPageBySlug } from '@/services/page'
import { notFound } from 'next/navigation'

const AboutPage = async () => {
  const page = await getPageBySlug('about', 'de')

  if (!page) {
    notFound()
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">{page.title}</h1>
      <div className="prose max-w-none">
        <PayloadRichText content={page.content} />
      </div>
    </main>
  )
}

export default AboutPage
```

**For English route** (`src/app/(frontend)/[locale]/about/page.tsx`):

```typescript
import PayloadRichText from '@/components/ui/PayloadRichText'
import { getPageBySlug } from '@/services/page'
import { notFound } from 'next/navigation'

const AboutPage = async () => {
  const page = await getPageBySlug('about', 'en')

  if (!page) {
    notFound()
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">{page.title}</h1>
      <div className="prose max-w-none">
        <PayloadRichText content={page.content} />
      </div>
    </main>
  )
}

export default AboutPage
```

**Key Points:**
- Use the **same slug** (`'about'`) in both files
- Change the **locale** parameter (`'de'` vs `'en'`)
- Route folder names must match the pathname mappings

### 4. Add Navigation Links (Optional)

If you want to add the page to navigation, update the relevant components:

- **Header navigation**: `src/components/Header/Header.tsx`
- **Footer navigation**: `src/components/Footer/Footer.tsx`

## Content Guidelines

### Using the Lexical Editor

The Pages collection uses the Lexical rich text editor. When adding content:

#### ✅ DO:
- Use the editor's formatting toolbar for headings, lists, bold, etc.
- Paste content as **plain text first**, then format using the toolbar
- Use consistent heading hierarchy (h1 → h2 → h3)

#### ❌ DON'T:
- Copy/paste directly from HTML pages (preserves inline styles)
- Use inline styles or custom HTML
- Add images or embedded media (not currently supported)

### Cleaning Pasted Content

If you accidentally paste content with inline styles, run the cleanup script:

```bash
npx tsx tmp/cleanPageStyles.ts
```

This script removes inline alignment styles (`text-align: left`, etc.) from the Lexical JSON.

## Styling

Pages use Tailwind's typography plugin (`prose` class) for automatic styling:

- **Headings**: Automatically sized and spaced
- **Paragraphs**: Proper vertical spacing
- **Lists**: Styled bullets/numbers with indentation
- **Links**: Colored and underlined
- **Code**: Monospace with background

The `prose` class is already applied in the page templates above.

## Search Integration

Pages are automatically indexed for search with a priority of **25** (lower than artists and posts).

Search configuration is in `src/payload.config.ts`:

```typescript
searchPlugin({
  collections: ['artists', 'posts', 'pages'],
  searchOverrides: {
    fields: [
      {
        name: 'priority',
        type: 'number',
        admin: {
          hidden: true,
        },
      },
    ],
  },
  beforeSync: beforeSyncHook,
})
```

## Existing Pages

Current pages in the system:

| Page | German Slug | English Slug | German URL | English URL |
|------|-------------|--------------|------------|-------------|
| Impressum/Imprint | `impressum` | `imprint` | `/impressum` | `/imprint` |
| Datenschutz/Privacy | `datenschutz` | `privacy-policy` | `/datenschutz` | `/privacy-policy` |
| Contact | `contact` | `contact` | `/contact` | `/contact` |

## Related Files

- **Collection**: `src/collections/Pages.ts`
- **Service**: `src/services/page.ts`
- **Routing**: `src/i18n/routing.ts`
- **Component**: `src/components/ui/PayloadRichText.tsx`
- **Cleanup Script**: `tmp/cleanPageStyles.ts`

## Troubleshooting

### Styles Not Applied

If headings and paragraphs don't have proper spacing/sizing:

1. **Check CSS**: Ensure `@plugin '@tailwindcss/typography'` is in `src/app/(frontend)/globals.css`
2. **Check HTML**: Verify `<div className="prose max-w-none">` wraps the content
3. **Clean cache**: Delete `.next` folder and restart dev server
4. **Clean content**: Run `npx tsx tmp/cleanPageStyles.ts` to remove inline styles

### Page Not Found (404)

1. **Check slug**: Ensure the slug in Payload matches the slug in `getPageBySlug()`
2. **Check locale**: Ensure you're passing the correct locale (`'de'` or `'en'`)
3. **Check routing**: Verify pathname mappings in `src/i18n/routing.ts`
4. **Check folder names**: Route folder names must match the URL paths

### Content Not Localized

1. **Switch locale**: Use the language dropdown in Payload Admin
2. **Fill both languages**: Ensure content is added for both DE and EN
3. **Check service call**: Verify the correct locale is passed to `getPageBySlug()`

## Contact Page Example

The contact page uses the same slug for both languages (`/contact`):

**Route file** (`src/app/(frontend)/[locale]/contact/page.tsx`):

```typescript
import PayloadRichText from '@/components/ui/PayloadRichText'
import { getPageBySlug } from '@/services/page'
import { notFound } from 'next/navigation'

const ContactPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  const page = await getPageBySlug('contact', locale as 'de' | 'en')

  if (!page) {
    notFound()
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">{page.title}</h1>
      <div className="prose max-w-none">
        <PayloadRichText content={page.content} />
      </div>
    </main>
  )
}

export default ContactPage
```

**Routing** (in `src/i18n/routing.ts`):

```typescript
pathnames: {
  '/contact': '/contact', // Same URL for both languages
}
```

When the URL is the same for both languages, you extract the `locale` from `params` and pass it to `getPageBySlug()`.
