'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Props for the NewsFeedSearch component
 */
interface NewsFeedSearchProps {
  /** Minimum number of characters required before triggering search (default: 3) */
  minChars?: number
  /** Debounce delay in milliseconds before triggering search (default: 500) */
  debounceMs?: number
  /** Custom placeholder text (falls back to localized 'search' translation) */
  placeholder?: string
}

/**
 * NewsFeed Search Component
 *
 * Provides a debounced search input for filtering news/project posts by title.
 * Automatically updates URL query parameters and resets pagination to page 1.
 *
 * Features:
 * - Debounced input (500ms default) to reduce API calls
 * - Minimum character requirement (3 chars default)
 * - Clear button (X icon) to reset search
 * - ESC key support to clear search
 * - Context-specific placeholder text
 * - URL-based state for shareability
 * - Real-time validation with localized error messages
 * - Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * // Basic usage with default settings
 * <NewsFeedSearch />
 *
 * // Custom placeholder and configuration
 * <NewsFeedSearch
 *   placeholder="Search news"
 *   minChars={3}
 *   debounceMs={500}
 * />
 * ```
 *
 * @see {@link NewsFeedServer} for server-side search implementation
 * @see {@link NewsFeedClient} for client-side search implementation
 */
const NewsFeedSearch: React.FC<NewsFeedSearchProps> = ({ minChars = 3, debounceMs = 500, placeholder }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useTranslations('custom.pagination')
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')
  const [showMinCharsWarning, setShowMinCharsWarning] = useState(false)
  const placeholderText = placeholder || t('search')

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmedValue = searchValue.trim()

      if (trimmedValue.length >= minChars) {
        params.set('search', trimmedValue)
        params.set('page', '1') // Reset to first page when searching
        setShowMinCharsWarning(false)
      } else {
        params.delete('search')
        // Show warning only if user has typed something but it's too short
        setShowMinCharsWarning(trimmedValue.length > 0 && trimmedValue.length < minChars)
      }

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.push(newUrl, { scroll: false })
    }, debounceMs)

    return () => clearTimeout(timeoutId)

    // Note: searchParams intentionally excluded from dependencies to prevent
    // infinite render loop (updating URL triggers searchParams change).
    // We read its current value but don't react to changes - the `searchValue`
    // state is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, pathname, router, minChars, debounceMs])

  const handleClear = (): void => {
    setSearchValue('')
    setShowMinCharsWarning(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  return (
    <div className="relative w-full" role="search">
      <div className="relative">
        <Search className="text-muted-foreground absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder={placeholderText}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'pl-6 pr-6',
            showMinCharsWarning && 'border-b-primary-error focus-visible:border-b-primary-error border-b-2',
          )}
          aria-label={placeholderText}
          aria-invalid={showMinCharsWarning}
          aria-describedby={showMinCharsWarning ? 'search-hint' : undefined}
        />
        {searchValue && (
          <button
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground absolute right-0 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {showMinCharsWarning && (
          <p id="search-hint" className="text-primary-error absolute left-0 top-full mt-1 text-xs">
            {t('searchMinChars', { minChars })}
          </p>
        )}
      </div>
    </div>
  )
}

export default NewsFeedSearch
