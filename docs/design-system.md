# Design System

## Color Palette

### Brand Colors

Defined in `src/app/(frontend)/globals.css`:

```css
--color-primary-yellow: #fcc302; /* Bright yellow accent */
--color-primary-platinum: #e3e3e3; /* Light gray background */
--color-primary-silver: #adb2b4; /* Medium gray (muted text, borders) */
--color-primary-black: #222126; /* Dark text (body copy) */
--color-primary-white: #ffffff; /* White background */
--color-primary-success: #4a9d3f; /* Success states */
--color-primary-error: #dc2626; /* Error states */
```

### Semantic Colors (shadcn/ui)

Base semantic colors from Tailwind/shadcn system:

- `primary` - Very dark (oklch(0.205 0 0)) - used for primary buttons
- `secondary` - Very light (oklch(0.97 0 0)) - used for secondary buttons
- `foreground` - Main text color
- `muted` / `muted-foreground` - Subdued text and backgrounds

## Typography

### Font Families

- **Body**: `Inter` - Clean, modern sans-serif for UI and body text
- **Display**: `Playfair Display` - Elegant serif for headings and emphasis
- **Utility**: `Hind` - Fallback sans-serif
- **Monospace**: `Montserrat` - Used sparingly

### Usage

- Body copy: `font-inter` (default on `<body>`)
- Article headings: `font-playfair`
- UI headings: `font-inter` with appropriate weight

## Component Patterns

### Links

**Reusable Link Component (Recommended)**

For consistent link styling across the site, use the `SchoerkeLink` component:

```tsx
import SchoerkeLink from '@/components/ui/SchoerkeLink'

// Text link with animated underline (default)
<SchoerkeLink href="/artists">View Artists</SchoerkeLink>

// Link with icon (no underline)
<SchoerkeLink href="/download.pdf" variant="with-icon">
  <Download className="h-4 w-4" />
  <span>Download PDF</span>
</SchoerkeLink>

// Icon-only link (no underline)
<SchoerkeLink href="https://facebook.com" variant="icon-only" aria-label="Facebook">
  <Facebook className="h-6 w-6" />
</SchoerkeLink>
```

**Benefits:**

- ✅ Consistent styling across all links
- ✅ Single source of truth for link patterns
- ✅ Built-in accessibility features
- ✅ TypeScript support with proper props
- ✅ Supports all standard anchor attributes

---

**Manual className patterns** (if not using SchoerkeLink component):

**Standard text links** (homepage URL in sidebar):

```tsx
className =
  'focus-visible:outline-primary-yellow after:bg-primary-yellow relative text-primary-black transition duration-150 ease-in-out after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 hover:text-primary-black/70 hover:after:w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4'
```

- Base color: `text-primary-black` (#222126 - dark, strong contrast)
- Hover: `hover:text-primary-black/70` (70% opacity for subtle dimming)
- Animated underline: Yellow bar emanates from center using `::after` pseudo-element
  - Starts at `w-0`, expands to `w-full` on hover
  - Positioned at center: `after:left-1/2 after:-translate-x-1/2 after:origin-center`
  - Yellow color: `after:bg-primary-yellow`
  - 300ms transition duration
- Focus: Yellow outline with offset (`focus-visible:outline-primary-yellow`)

**Links with icons** (downloads, icon+text combinations):

```tsx
className =
  'group inline-flex items-center gap-2 text-primary-black transition duration-150 ease-in-out hover:text-primary-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-yellow'
```

- Base color: `text-primary-black`
- Hover: `hover:text-primary-black/70` (color dims slightly)
- **No underline animation** - icon provides sufficient visual affordance
- Focus: Yellow outline with offset

**Icon-only links** (social media icons):

```tsx
className =
  'text-primary-black transition duration-150 ease-in-out hover:text-primary-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-yellow'
```

- Base color: `text-primary-black`
- Hover: `hover:text-primary-black/70` (color dims slightly)
- **No underline animation** - icons are self-evident as clickable elements
- Focus: Yellow outline with offset

**When NOT to use primary-black for links:**

- Call-to-action buttons that need high visibility (use `bg-primary-yellow` with `text-primary-black`)
- Disabled states (use `text-gray-400` or `text-muted-foreground`)

### Headings

**Section headings** (e.g., "Downloads", "Homepage", sidebar sections):

```tsx
className = 'text-sm font-semibold uppercase tracking-wider text-primary-black'
```

- Color: `text-primary-black` (#222126 - dark, strong contrast)
- Style: Uppercase with wide tracking for visual hierarchy
- Weight: Semibold (600)

**Article/content headings**:

```tsx
className = 'font-playfair text-2xl font-bold text-gray-900'
```

- Font: Playfair Display (serif)
- Color: `text-gray-900` (very dark, near-black)

### Buttons

**Primary action button**:

```tsx
className =
  'bg-primary-yellow text-primary-black hover:bg-primary-yellow/90 focus:ring-primary-yellow inline-flex items-center gap-2 rounded-lg px-8 py-4 text-lg font-medium shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
```

- Background: Bright yellow (`bg-primary-yellow`)
- Text: Dark (`text-primary-black`) for maximum contrast
- Hover: Slight opacity reduction (`hover:bg-primary-yellow/90`)

**Secondary action button**:

Use shadcn Button component with `variant="secondary"`:

```tsx
<Button variant="secondary">Action</Button>
```

### Icons

**Icon sizing**:

- Social media icons: `h-6 w-6` (24px)
- Small inline icons: `h-4 w-4` (16px)
- External link indicators: `h-3 w-3` (12px)

**Icon colors**:

- Inherit from parent link/button color
- Always include `aria-hidden={true}` for decorative icons

## Accessibility

### Focus States

All interactive elements MUST have visible focus indicators:

```tsx
focus:outline-none focus:ring-2 focus:ring-[COLOR] focus:ring-offset-2
```

Where `[COLOR]` matches the element's primary color (e.g., `focus:ring-primary-black` for black links).

### ARIA Labels

- Links with icon-only content need `aria-label`
- Decorative icons need `aria-hidden={true}`
- Form inputs need proper labels or `aria-label`

### Color Contrast

All text must meet WCAG AA contrast ratios:

- Body text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

Current combinations that pass:

- ✅ `text-primary-black` on white: ~16:1 (excellent)
- ✅ `text-gray-500` on white: ~5.8:1 (good)
- ✅ `text-primary-black` on `bg-primary-yellow`: ~8.4:1 (excellent)

## Spacing

### Component Spacing

- Between sibling sections: `space-y-6` (24px)
- Within sections (heading to content): `mb-2` or `mb-4`
- Card padding: `p-6` (24px)
- Container padding: `px-4` mobile, `px-8` desktop

### Layout Breakpoints

Defined in `tailwind.config.js`:

- `sm`: 40rem (640px)
- `md`: 48rem (768px)
- `lg`: 64rem (1024px)
- `xl`: 80rem (1280px)
- `2xl`: 86rem (1376px)

## Animations

### Transitions

Standard transition for interactive elements:

```tsx
transition - colors // For color changes (hover, focus)
```

Custom durations (when needed):

```tsx
transition-all duration-200 // Fast interactions
transition-all duration-300 // Standard (default)
transition-all duration-500 // Slow/emphasized
```

## Examples

### Complete Link Example

```tsx
<a
  href="/example"
  className="focus-visible:outline-primary-yellow after:bg-primary-yellow text-primary-black hover:text-primary-black/70 relative transition duration-150 ease-in-out after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:transition-all after:duration-300 hover:after:w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
>
  Link Text
</a>
```

**How the animated underline works:**

1. `relative` - Positions link as reference for `::after` pseudo-element
2. `after:absolute after:-bottom-1 after:left-0` - Positions underline 4px below text, starting from left edge
3. `after:h-0.5 after:w-0` - Initial state: 2px tall, 0 width (invisible)
4. `after:bg-primary-yellow` - Yellow color for the underline
5. `hover:after:w-full` - On hover, expands to full width of link
6. `after:transition-all after:duration-300` - Smooth 300ms animation

### Complete Button Example

```tsx
<button
  type="button"
  className="bg-primary-yellow text-primary-black hover:bg-primary-yellow/90 focus:ring-primary-yellow inline-flex items-center gap-2 rounded-lg px-8 py-4 text-lg font-medium shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
>
  <Icon className="h-5 w-5" aria-hidden={true} />
  <span>Call to Action</span>
</button>
```

### Complete Section Heading Example

```tsx
<h3 className="text-primary-black mb-2 text-sm font-semibold uppercase tracking-wider">Section Title</h3>
```

## References

- Brand colors: `src/app/(frontend)/globals.css`
- Tailwind config: `tailwind.config.js`
- shadcn components: `src/components/ui/`
- Typography plugin: `@tailwindcss/typography`
