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
import { ReactNode, useEffect, useMemo, useState } from 'react'
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
          router.replace(currentPath as any, { locale: newLocale })
        },
      },
    ]

    return actions
  }, [locale, router])

  return (
    <KBarProvider actions={staticActions}>
      <DynamicSearchActions />
      <KBarPortal>
        <KBarPositioner className="z-50 bg-black/50 p-4 backdrop-blur-sm md:p-0">
          <KBarAnimator className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl md:rounded-xl">
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
        ref={query.inputRefSetter}
        type="text"
        value={searchQuery}
        onChange={handleChange}
        placeholder={locale === 'de' ? 'Suchen oder Befehl eingeben...' : 'Search or type a command...'}
        className="w-full border-b border-gray-200 px-4 py-3 pr-12 text-base outline-none placeholder:text-gray-400 md:py-4"
        autoFocus
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
  const [allEmployees, setAllEmployees] = useState<Array<{ id: string; name: string; email: string }>>([])
  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }))

  // Fetch all employees once on mount for email commands
  useEffect(() => {
    async function fetchAllEmployees() {
      try {
        const res = await fetch(`/api/employees?locale=${locale}&limit=100`)
        if (res.ok) {
          const data = await res.json()
          const employees = data.docs
            .filter((emp: any) => emp.email)
            .map((emp: any) => ({
              id: emp.id,
              name: emp.name,
              email: emp.email,
            }))
          setAllEmployees(employees)
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err)
      }
    }
    fetchAllEmployees()
  }, [locale])

  // Debounced search effect
  useEffect(() => {
    const currentQuery = searchQuery.trim()

    if (currentQuery.length < 3) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await searchContent(currentQuery, locale)

        // Flatten all results into a single array (max 30 total)
        const allResults = [
          ...response.results.artists.slice(0, 10),
          ...response.results.employees.slice(0, 5),
          ...response.results.pages.slice(0, 5),
          ...response.results.repertoire.slice(0, 5),
        ].slice(0, 30)

        setSearchResults(allResults)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      }
    }, 150) // 150ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, locale])

  // Register dynamic actions from search results
  const actions = useMemo(() => {
    // Only show search results if we have them
    if (searchResults.length === 0) {
      return []
    }

    // Separate results by collection type for proper ordering
    const artists = searchResults.filter((doc) => doc.relationTo === 'artists')
    const employees = searchResults.filter((doc) => doc.relationTo === 'employees')
    const pages = searchResults.filter((doc) => doc.relationTo === 'pages')
    const repertoire = searchResults.filter((doc) => doc.relationTo === 'repertoire')

    // Helper to create action from doc
    const createAction = (doc: SearchDoc, priority: number) => ({
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
        router.push(path as any)
      },
    })

    // Create actions with priorities: Artists (highest), Team, Pages, Repertoire
    const artistActions = artists.map((doc) => createAction(doc, 100))
    const employeeActions = employees.map((doc) => createAction(doc, 90))
    const pageActions = pages.map((doc) => createAction(doc, 80))
    const repertoireActions = repertoire.map((doc) => createAction(doc, 70))

    console.log(
      '[SearchProvider] Created actions - artists:',
      artistActions.length,
      'employees:',
      employeeActions.length,
      'pages:',
      pageActions.length,
      'repertoire:',
      repertoireActions.length,
    )

    // Add "Email [Name]" commands only when user is searching
    // This keeps the initial menu clean while keeping email commands accessible via search
    const commandLabel = locale === 'de' ? 'Befehl' : 'Command'
    const emailActions =
      searchQuery.trim().length > 0
        ? allEmployees.map((employee) => ({
            id: `email-${employee.id}`,
            name: `${locale === 'de' ? 'E-Mail an' : 'Email'} ${employee.name}`,
            keywords: `email mail ${employee.name}`,
            section: locale === 'de' ? 'Befehle' : 'Commands',
            subtitle: commandLabel,
            priority: 60, // Lower priority than content, so Commands appear last
            perform: () => {
              window.location.href = `mailto:${employee.email}`
            },
          }))
        : []

    const totalActions = [...artistActions, ...employeeActions, ...pageActions, ...repertoireActions, ...emailActions]

    // Return in desired order: Artists, Team, Pages, Repertoire, Commands
    return totalActions
  }, [searchResults, allEmployees, locale, router, searchQuery])

  useRegisterActions(actions, [actions])

  return null
}

/**
 * Renders KBar results
 */
function RenderResults() {
  const { results } = useMatches()

  return (
    <div className="overflow-y-auto p-2">
      <KBarResults
        items={results}
        maxHeight={800}
        onRender={({ item, active }) =>
          typeof item === 'string' ? (
            <div className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">{item}</div>
          ) : (
            <div
              style={{
                padding: '12px 16px',
                background: active ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{item.name}</span>
              {item.subtitle && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#999',
                    marginLeft: '16px',
                    flexShrink: 0,
                  }}
                >
                  {item.subtitle}
                </span>
              )}
            </div>
          )
        }
      />
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

export default SearchProvider
