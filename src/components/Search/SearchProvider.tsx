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

import { searchContent, SearchDoc } from '@/services/search'
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useKBar,
  useMatches,
  useRegisterActions,
} from 'kbar'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { KBarTutorial } from './KBarTutorial'

interface SearchProviderProps {
  children: ReactNode
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const router = useRouter()
  const locale = useLocale() as 'de' | 'en'

  // Static navigation actions with locale-based labels
  const staticActions = useMemo(() => {
    const actions = [
      {
        id: 'artists',
        name: locale === 'de' ? 'Künstler' : 'Artists',
        shortcut: locale === 'de' ? ['k'] : ['a'],
        keywords: 'artists musicians künstler musiker',
        perform: () => router.push(`/${locale}/artists`),
      },
      {
        id: 'projects',
        name: locale === 'de' ? 'Projekte' : 'Projects',
        shortcut: ['p'],
        keywords: 'projects projekte',
        perform: () => router.push(`/${locale}/projects`),
      },
      {
        id: 'news',
        name: locale === 'de' ? 'Neuigkeiten' : 'News',
        shortcut: ['n'],
        keywords: 'news neuigkeiten',
        perform: () => router.push(`/${locale}/news`),
      },
      {
        id: 'contact',
        name: locale === 'de' ? 'Kontakt' : 'Contact',
        shortcut: locale === 'de' ? ['t'] : ['c'],
        keywords: 'contact kontakt',
        priority: 1, // Higher priority for contact
        perform: () => router.push(`/${locale}/contact`),
      },
      {
        id: 'team',
        name: 'Team',
        shortcut: locale === 'de' ? ['m'] : ['t'],
        keywords: 'team',
        perform: () => router.push(`/${locale}/team`),
      },
      {
        id: 'locale-switch',
        name: locale === 'de' ? 'Switch to English' : 'Zu Deutsch wechseln',
        shortcut: ['l'],
        keywords: 'language locale deutsch english sprache wechseln',
        priority: -1, // Lower priority so it appears last
        perform: () => {
          const newLocale = locale === 'de' ? 'en' : 'de'
          const currentPath = window.location.pathname.replace(`/${locale}`, '')
          router.push(`/${newLocale}${currentPath}`)
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
            <KBarSearch
              key={locale}
              className="w-full border-b border-gray-200 px-4 py-3 text-base outline-none placeholder:text-gray-400 md:py-4"
              defaultPlaceholder={locale === 'de' ? 'Suchen oder Befehl eingeben...' : 'Search or type a command...'}
            />
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
 * Dynamically registers search results as KBar actions
 */
function DynamicSearchActions() {
  const locale = useLocale() as 'de' | 'en'
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<SearchDoc[]>([])
  const { searchQuery } = useKBar((state) => ({
    searchQuery: state.searchQuery,
  }))

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
          ...response.results.artists.slice(0, 5),
          ...response.results.recordings.slice(0, 5),
          ...response.results.news.slice(0, 5),
          ...response.results.projects.slice(0, 5),
          ...response.results.employees.slice(0, 5),
          ...response.results.pages.slice(0, 5),
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
  useRegisterActions(
    searchResults.map((doc) => ({
      id: `search-${doc.id}`,
      name: doc.title.substring(0, 100), // Truncate long titles
      section: getSection(doc.relationTo),
      perform: () => {
        const path = getDocumentPath(doc, locale)
        router.push(path)
      },
    })),
    [searchResults, router, locale],
  )

  return null
}

/**
 * Renders KBar results
 */
function RenderResults() {
  const { results } = useMatches()

  return (
    <div className="max-h-96 overflow-y-auto p-2 md:max-h-[28rem]">
      <KBarResults
        items={results}
        onRender={({ item, active }) =>
          typeof item === 'string' ? (
            <div className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">{item}</div>
          ) : (
            <div
              className={`min-h-[44px] cursor-pointer rounded px-4 py-3 transition-colors ${active ? 'bg-[#FCC302]/90 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate pr-2">{item.name}</span>
                {item.shortcut && (
                  <span className="hidden text-xs text-gray-400 md:inline">
                    {item.shortcut.map((key) => (
                      <kbd key={key} className="ml-1 rounded bg-gray-100 px-1.5 py-0.5">
                        {key}
                      </kbd>
                    ))}
                  </span>
                )}
              </div>
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
function getSection(relationTo: string): string {
  const sections: Record<string, string> = {
    artists: 'Artists',
    recordings: 'Recordings',
    posts: 'Posts',
    employees: 'Team',
    pages: 'Pages',
  }
  return sections[relationTo] || 'Results'
}

/**
 * Get document URL path
 */
function getDocumentPath(doc: SearchDoc, locale: string): string {
  switch (doc.relationTo) {
    case 'artists':
      // Use slug if available, otherwise fall back to ID
      return `/${locale}/artists/${doc.slug || doc.relationId}`
    case 'recordings':
      return `/${locale}/recordings/${doc.relationId}`
    case 'posts':
      // Use slug if available, otherwise fall back to ID
      return `/${locale}/news/${doc.slug || doc.relationId}` // TODO: Detect news vs projects
    case 'employees':
      return `/${locale}/team`
    case 'pages':
      return `/${locale}/${doc.relationId}`
    default:
      return `/${locale}`
  }
}
