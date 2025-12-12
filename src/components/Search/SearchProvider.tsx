/**
 * Search Provider Component
 *
 * Wraps the application with KBar command palette functionality.
 * Provides cmd-k/ctrl-k keyboard shortcut for quick search and navigation.
 *
 * Features:
 * - Static navigation actions (always visible)
 * - Dynamic search results (appear as user types)
 * - Locale switching
 * - Mobile-friendly design
 */

'use client'

import { fetchEmployees } from '@/actions/employees'
import { GENERAL_CONTACT } from '@/constants/contact'
import { useRouter } from '@/i18n/navigation'
import { searchContent, SearchDoc } from '@/services/search'
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  useKBar,
  useMatches,
  useRegisterActions,
} from 'kbar'
import { useLocale } from 'next-intl'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { filterEmailCommands } from './emailFiltering'
import KBarTutorial from './KBarTutorial'

interface SearchProviderProps {
  children: ReactNode
}

const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const router = useRouter()
  const locale = useLocale() as 'de' | 'en'

  // Static navigation actions (no shortcuts - they interfere with system-wide shortcuts)
  const staticActions = useMemo(() => {
    const navigationSection = locale === 'de' ? 'Navigation' : 'Navigation'
    const settingsSection = locale === 'de' ? 'Einstellungen' : 'Settings'
    const pageLabel = locale === 'de' ? 'Seite' : 'Page'
    const settingLabel = locale === 'de' ? 'Einstellung' : 'Setting'

    const actions = [
      {
        id: 'home',
        name: locale === 'de' ? 'Startseite' : 'Home',
        keywords: 'home startseite main',
        section: navigationSection,
        subtitle: pageLabel,
        priority: 2, // High priority for home
        perform: () => router.push('/'),
      },
      {
        id: 'artists',
        name: locale === 'de' ? 'Künstler' : 'Artists',
        keywords: 'artists musicians künstler musiker',
        section: navigationSection,
        subtitle: pageLabel,
        perform: () => router.push('/artists'),
      },
      {
        id: 'projects',
        name: locale === 'de' ? 'Projekte' : 'Projects',
        keywords: 'projects projekte',
        section: navigationSection,
        subtitle: pageLabel,
        perform: () => router.push('/projects'),
      },
      {
        id: 'news',
        name: 'News',
        keywords: 'news neuigkeiten',
        section: navigationSection,
        subtitle: pageLabel,
        perform: () => router.push('/news'),
      },
      {
        id: 'contact',
        name: locale === 'de' ? 'Kontakt' : 'Contact',
        keywords: 'contact kontakt',
        section: navigationSection,
        subtitle: pageLabel,
        priority: 1, // Higher priority for contact
        perform: () => router.push('/kontakt'),
      },
      {
        id: 'team',
        name: 'Team',
        keywords: 'team',
        section: navigationSection,
        subtitle: pageLabel,
        perform: () => router.push('/team'),
      },
      {
        id: 'locale-switch',
        name: locale === 'de' ? 'Switch to English' : 'Zu Deutsch wechseln',
        keywords: 'language locale deutsch english sprache wechseln',
        section: settingsSection,
        subtitle: settingLabel,
        priority: -1, // Lower priority so it appears last
        perform: () => {
          const newLocale = locale === 'de' ? 'en' : 'de'
          const currentPath = window.location.pathname.replace(`/${locale}`, '')
          router.replace(currentPath as Parameters<typeof router.replace>[0], { locale: newLocale })
        },
      },
      {
        id: 'call-office',
        name: locale === 'de' ? 'Schoerke Büro anrufen' : 'Call Schoerke Office',
        keywords: 'call phone anrufen telefon office büro command commands befehl befehle',
        section: locale === 'de' ? 'Befehle' : 'Commands',
        subtitle: locale === 'de' ? 'Befehl' : 'Command',
        priority: 1,
        perform: () => {
          // Remove spaces and parentheses from phone number for tel: link
          const phoneNumber = GENERAL_CONTACT.phone.replace(/[\s()-]/g, '')
          window.location.href = `tel:${phoneNumber}`
        },
      },
    ]

    return actions
  }, [locale, router])

  return (
    <KBarProvider actions={staticActions}>
      <DynamicSearchActions />
      <KBarPortal>
        <KBarPositioner
          className="z-50 bg-black/50 backdrop-blur-sm"
          style={{
            padding: 'var(--kbar-padding-top) 16px 16px',
          }}
        >
          <KBarAnimator className="font-inter w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl md:rounded-xl">
            <SearchInputWithClear locale={locale} />
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      <KBarTutorial />
      {children}
    </KBarProvider>
  )
}

/**
 * Custom search input with clear button
 * Uses a fully controlled input instead of KBarSearch to enable clearing
 */
function SearchInputWithClear({ locale }: { locale: 'de' | 'en' }) {
  const { query } = useKBar((state) => state)
  const { searchQuery, visualState } = useKBar((state) => ({
    searchQuery: state.searchQuery,
    visualState: state.visualState,
  }))

  // Use a callback ref to set KBar's input ref without accessing ref during render
  const handleRefCallback = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) {
        query.inputRefSetter(node)
      }
    },
    [query],
  )

  // Clear search when KBar closes (like Raycast)
  useEffect(() => {
    // Clear on animating-out (ESC pressed) or hidden (after animation completes)
    // Guard: only clear if there's actually text (length > 0), not just truthy check
    if ((visualState === 'animating-out' || visualState === 'hidden') && searchQuery.length > 0) {
      query.setSearch('')
    }
  }, [visualState, searchQuery, query])

  const handleClear = () => {
    query.setSearch('')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    query.setSearch(e.target.value)
  }

  return (
    <div className="relative">
      <input
        ref={handleRefCallback}
        type="text"
        value={searchQuery}
        onChange={handleChange}
        placeholder={locale === 'de' ? 'Suchen oder Befehl eingeben...' : 'Search or type a command...'}
        className="border-primary-platinum text-primary-black placeholder:text-primary-silver w-full border-b px-4 py-3 pr-12 text-base outline-none md:py-4"
        autoFocus
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          className="text-primary-silver hover:bg-primary-platinum hover:text-primary-black absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 transition-colors duration-150"
          aria-label={locale === 'de' ? 'Suche löschen' : 'Clear search'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  )
}

/**
 * Dynamically registers search results as KBar actions
 */
function DynamicSearchActions() {
  const locale = useLocale() as 'de' | 'en'
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<SearchDoc[]>([])
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; email: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }))

  // Fetch all employees once on mount for email commands
  useEffect(() => {
    async function fetchAllEmployees() {
      try {
        const result = await fetchEmployees({ locale, limit: 100 })
        const employees = result.docs
          .filter((emp) => emp.email)
          .map((emp) => ({
            id: emp.id,
            name: emp.name,
            email: emp.email,
          }))
        setAllEmployees(employees)
      } catch (err) {
        console.error('Failed to fetch employees:', err)
      }
    }
    fetchAllEmployees()
  }, [locale])

  // Debounced search effect with race condition protection
  useEffect(() => {
    const currentQuery = searchQuery.trim()

    // Early return if query is too short - clear state asynchronously
    const shouldSearch = currentQuery.length >= 3

    if (!shouldSearch) {
      // Use setTimeout to make setState async, avoiding cascading renders
      const timeoutId = setTimeout(() => {
        setSearchResults([])
        setIsSearching(false)
      }, 0)
      return () => clearTimeout(timeoutId)
    }

    // Abort previous search to prevent race conditions
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    const timeoutId = setTimeout(async () => {
      // Set loading state at the start of the async operation
      setIsSearching(true)

      try {
        const response = await searchContent(currentQuery, locale)

        // Only update state if this request wasn't aborted
        if (!controller.signal.aborted) {
          // Flatten all results into a single array (max 30 total)
          // Note: Pages excluded - Navigation section already covers these
          const allResults = [
            ...response.results.artists.slice(0, 10),
            ...response.results.employees.slice(0, 5),
            ...response.results.repertoire.slice(0, 5),
          ].slice(0, 30)

          setSearchResults(allResults)
          setIsSearching(false)
        }
      } catch (error) {
        // Only update state if this request wasn't aborted
        if (!controller.signal.aborted) {
          console.error('Search error:', error)
          setSearchResults([])
          setIsSearching(false)
        }
      }
    }, 150) // 150ms debounce

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [searchQuery, locale])

  // Register dynamic actions from search results
  const actions = useMemo(() => {
    const commandLabel = locale === 'de' ? 'Befehl' : 'Command'
    const query = searchQuery.trim().toLowerCase()

    // Register a special loading marker action so RenderResults can detect loading state
    if (isSearching) {
      return [
        {
          id: '__loading__',
          name: '__LOADING_MARKER__',
          keywords: searchQuery, // Include query to prevent filtering
          section: '',
          priority: -1,
          perform: () => {},
        },
      ]
    }

    // Filter employees for email commands using extracted helper
    const filteredEmployees = filterEmailCommands(query, allEmployees, searchResults)

    const emailActions = filteredEmployees.map((employee) => ({
      id: `email-${employee.id}`,
      name: `${locale === 'de' ? 'E-Mail an' : 'Email'} ${employee.name}`,
      // Include search query and command keywords to prevent KBar from filtering it out
      keywords: `${searchQuery} email mail e-mail command commands befehl befehle ${employee.name}`,
      section: locale === 'de' ? 'Befehle' : 'Commands',
      subtitle: commandLabel,
      priority: 60, // Lower priority than content, so Commands appear last
      perform: () => {
        window.location.href = `mailto:${employee.email}`
      },
    }))

    // Always return email actions even when no search results (e.g., "email" query shows all employees)
    if (searchResults.length === 0) {
      return emailActions // Return email actions, or empty array if none
    }

    // Separate results by collection type for proper ordering
    const artists = searchResults.filter((doc) => doc.relationTo === 'artists')
    const employees = searchResults.filter((doc) => doc.relationTo === 'employees')
    const pages = searchResults.filter((doc) => doc.relationTo === 'pages')
    // Repertoire filtering removed

    // Create actions with priorities: Artists (highest), Team, Pages, Repertoire
    const artistActions = artists.map((doc) => createSearchAction(doc, searchQuery, locale, router, 100))
    const employeeActions = employees.map((doc) => createSearchAction(doc, searchQuery, locale, router, 90))
    const pageActions = pages.map((doc) => createSearchAction(doc, searchQuery, locale, router, 80))
    // Removed repertoireActions as repertoire is excluded

    const totalActions = [...artistActions, ...employeeActions, ...pageActions, ...emailActions] // Removed repertoireActions

    // Return in desired order: Artists, Team, Pages, Repertoire, Commands
    return totalActions
  }, [searchResults, allEmployees, locale, router, searchQuery, isSearching])

  useRegisterActions(actions, [actions])

  return null
}

/**
 * Renders KBar results with loading and empty states
 */
function RenderResults() {
  const { results } = useMatches()
  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }))
  const locale = useLocale() as 'de' | 'en'

  const query = searchQuery.trim()
  const hasMinChars = query.length >= 3

  // Detect loading state by checking for the __loading__ marker action
  const isSearching = results.some((r) => typeof r !== 'string' && r.id === '__loading__')

  // Check if we have any results at all (including static navigation actions)
  const hasAnyResults = results.some((r) => typeof r !== 'string')

  // Show empty state only if: has min chars, not searching, and truly no results
  const shouldShowEmptyState = hasMinChars && !isSearching && !hasAnyResults

  return (
    <div className="overflow-y-auto p-2">
      {isSearching ? (
        <div className="text-primary-silver px-4 py-8 text-center text-sm">
          {locale === 'de' ? 'Suche läuft...' : 'Searching...'}
        </div>
      ) : shouldShowEmptyState ? (
        <div className="text-primary-silver px-4 py-8 text-center text-sm">
          {locale === 'de' ? `Keine Ergebnisse für "${searchQuery}"` : `No results found for "${searchQuery}"`}
        </div>
      ) : (
        <KBarResults
          items={results}
          maxHeight={800}
          onRender={({ item, active }) => {
            // Safety check: item can be undefined in some cases
            if (!item) return <div />

            return typeof item === 'string' ? (
              <div className="text-primary-black px-4 py-2 text-xs font-semibold uppercase tracking-wider">{item}</div>
            ) : (
              <div
                className={`flex cursor-pointer items-center justify-between px-4 py-3 transition-colors duration-150 ${
                  active ? 'bg-primary-platinum' : 'transparent'
                }`}
              >
                <span className="text-primary-black">{item.name}</span>
                {item.subtitle && (
                  <span className="text-primary-silver ml-4 flex-shrink-0 text-xs">{item.subtitle}</span>
                )}
              </div>
            )
          }}
        />
      )}
    </div>
  )
}

/**
 * Get section name for grouping results
 */
function getSection(relationTo: string, locale: 'de' | 'en'): string {
  const sections: Record<string, Record<'de' | 'en', string>> = {
    artists: { de: 'Künstler', en: 'Artists' },
    employees: { de: 'Team', en: 'Team' },
    pages: { de: 'Seiten', en: 'Pages' },
    repertoire: { de: 'Repertoire', en: 'Repertoire' },
  }
  return sections[relationTo]?.[locale] || (locale === 'de' ? 'Ergebnisse' : 'Results')
}

/**
 * Get type label for individual items (shown on the right in Raycast style)
 */
function getTypeLabel(relationTo: string, locale: 'de' | 'en'): string {
  const types: Record<string, Record<'de' | 'en', string>> = {
    artists: { de: 'Künstler', en: 'Artist' },
    employees: { de: 'Mitarbeiter', en: 'Team Member' },
    pages: { de: 'Seite', en: 'Page' },
    repertoire: { de: 'Repertoire', en: 'Repertoire' },
  }
  return types[relationTo]?.[locale] || (locale === 'de' ? 'Ergebnis' : 'Result')
}

/**
 * Get document URL path (locale-agnostic, router will add locale prefix)
 */
function getDocumentPath(doc: SearchDoc): string {
  switch (doc.relationTo) {
    case 'artists':
      // Use slug if available, otherwise fall back to ID
      return `/artists/${doc.slug || doc.relationId}`
    case 'employees':
      return `/team` // Employees don't have individual pages
    case 'pages':
      return `/${doc.slug || doc.relationId}`
    case 'repertoire':
      return `/repertoire` // Repertoire doesn't have individual pages yet
    default:
      return '/'
  }
}

/**
 * Factory function to create KBar actions from search documents
 *
 * @param doc - Search document to create action from
 * @param searchQuery - Current search query (for keywords)
 * @param locale - Current locale for section/subtitle labels
 * @param router - Next.js router for navigation
 * @param priority - Action priority (higher = appears first)
 * @returns KBar action object
 */
function createSearchAction(
  doc: SearchDoc,
  searchQuery: string,
  locale: 'de' | 'en',
  router: ReturnType<typeof useRouter>,
  priority: number,
) {
  return {
    id: `search-${doc.id}`,
    name: doc.title.substring(0, 100),
    // Add a unique keyword that includes the search query so KBar doesn't filter it out
    // Each result gets its own unique keyword combining the query + doc title
    keywords: `${searchQuery} ${doc.title}`,
    section: getSection(doc.relationTo, locale),
    subtitle: getTypeLabel(doc.relationTo, locale),
    priority,
    perform: () => {
      const path = getDocumentPath(doc)
      router.push(path as Parameters<typeof router.push>[0])
    },
  }
}

export default SearchProvider
