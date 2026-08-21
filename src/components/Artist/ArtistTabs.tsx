'use client'

import { fetchRecordingsByArtist } from '@/actions/recordings'
import { RECORDING_ROLES } from '@/constants/recordingOptions'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import type { Artist, Post, Recording, Repertoire } from '@/payload-types'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React, { useEffect, useRef, useState } from 'react'
import NewsFeedClient from '../NewsFeed/NewsFeedClient'
import { BiographyTab, MediaTab, ProjectsTab, RecordingsTab, RepertoireTab } from './ArtistTabContent'

type TabId = 'biography' | 'repertoire' | 'discography' | 'media' | 'news' | 'projects'

interface MobileTabSelectProps {
  tabs: TabId[]
  activeTab: TabId
  onChange: (tab: TabId) => void
  getLabel: (tab: TabId) => string
  tabPanelId: string
}

/**
 * Mobile-only tab switcher styled as a dropdown rather than the desktop's
 * wrapped underline tabs, so the tab list never overflows or wraps on
 * narrow screens. The active option is highlighted with the site's yellow
 * accent + a small dot marker, matching the approved design mockup.
 *
 * Deliberately built from raw @radix-ui/react-select primitives instead of
 * the shared src/components/ui/Select.tsx wrapper: that wrapper's SelectItem
 * hard-codes a checkmark indicator and scroll buttons neither needed nor
 * wanted here (this uses a dot marker instead), and this is the only
 * consumer of this exact visual treatment.
 */
const MobileTabSelect: React.FC<MobileTabSelectProps> = ({ tabs, activeTab, onChange, getLabel, tabPanelId }) => {
  return (
    <SelectPrimitive.Root value={activeTab} onValueChange={(value) => onChange(value as TabId)}>
      <SelectPrimitive.Trigger
        aria-label={getLabel(activeTab)}
        aria-controls={tabPanelId}
        className="border-input flex h-12 w-full max-w-xs items-center justify-between rounded-md border bg-white px-4 text-base font-bold text-gray-900"
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={10}
          className="z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-white shadow-lg"
        >
          <SelectPrimitive.Viewport>
            {tabs.map((tab) => (
              <SelectPrimitive.Item
                key={tab}
                value={tab}
                className="flex h-12 cursor-pointer select-none items-center border-b border-gray-100 px-4 text-base font-bold text-gray-900 last:border-b-0 focus:outline-none data-[state=checked]:bg-primary-yellow/10"
              >
                <span
                  aria-hidden="true"
                  className={`bg-primary-yellow mr-2 h-1.5 w-1.5 shrink-0 rounded-full ${tab === activeTab ? 'opacity-100' : 'opacity-0'}`}
                />
                <SelectPrimitive.ItemText>{getLabel(tab)}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

interface ArtistTabsProps {
  artist: Artist
  locale: string
  hasNews: boolean
  hasProjects: boolean
}

// Always return 'biography' for initial render to avoid hydration mismatch
// The hash will be read and applied in useEffect after hydration
function getInitialTab(): TabId {
  return 'biography'
}

type MediaSection = 'images' | 'videos'

// Strip the locale prefix so the key is identical across languages
// (e.g. /de/artists/foo and /en/artists/foo both map to /artists/foo)
function getTabStorageKey(pathname: string): string {
  return pathname.replace(/^\/(de|en)(?=\/)/, '') || '/'
}

function readStoredTab(pathname: string): { tab: TabId; mediaSection?: MediaSection } | null {
  try {
    const raw = sessionStorage.getItem(getTabStorageKey(pathname))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tab?: unknown; mediaSection?: unknown }
    if (typeof parsed.tab !== 'string') return null
    const mediaSection: MediaSection | undefined =
      parsed.mediaSection === 'videos' ? 'videos' : parsed.mediaSection === 'images' ? 'images' : undefined
    return { tab: parsed.tab as TabId, mediaSection }
  } catch {
    return null
  }
}

function storeTab(pathname: string, tab: TabId, mediaSection: MediaSection): void {
  try {
    sessionStorage.setItem(getTabStorageKey(pathname), JSON.stringify({ tab, mediaSection }))
  } catch {
    // Storage unavailable (private mode, quota) — persistence is best-effort
  }
}

/**
 * Manages tab state and data fetching. State (active tab, media section, role filter)
 * is intentionally NOT reset when the locale changes so the user keeps their place;
 * locale-dependent data (recordings) is refetched for the new locale instead.
 */
const ArtistTabs: React.FC<ArtistTabsProps> = ({ artist, locale, hasNews, hasProjects }) => {
  const t = useTranslations('custom.pages.artist')
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingsFetched, setRecordingsFetched] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const fetchedLocaleRef = useRef<{ locale: 'de' | 'en'; artistId: number } | null>(null)

  // Available tabs
  const tabs: TabId[] = (['biography', 'repertoire', 'discography', 'media', 'news', 'projects'] as TabId[]).filter(
    (tab) => {
      if (tab === 'news') return hasNews
      if (tab === 'projects') return hasProjects
      return true
    }
  )

  const [mediaSection, setMediaSection] = useState<MediaSection>('images')

  // Read hash from URL after hydration to set initial tab; fall back to the
  // sessionStorage snapshot so the tab survives a locale switch that causes a
  // remount (e.g. App Router unmounting the client tree during navigation).
  useEffect(() => {
    const hash = window.location.hash.slice(1) // e.g. "media-videos"
    const mediaMatch = /^media-(images|videos)$/.exec(hash)
    if (mediaMatch) {
      setActiveTab('media')
      setMediaSection(mediaMatch[1] as MediaSection)
    } else if (tabs.includes(hash as TabId)) {
      setActiveTab(hash as TabId)
    } else {
      const stored = readStoredTab(window.location.pathname)
      if (stored && tabs.includes(stored.tab)) {
        setActiveTab(stored.tab)
        if (stored.tab === 'media' && stored.mediaSection) {
          setMediaSection(stored.mediaSection)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once after mount

  // Update URL hash when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    storeTab(window.location.pathname, tab, mediaSection)
    if (tab === 'media') {
      window.history.pushState(null, '', `#media-${mediaSection}`)
    } else {
      window.history.pushState(null, '', `#${tab}`)
    }
  }

  const handleMediaSectionChange = (section: MediaSection) => {
    setMediaSection(section)
    storeTab(window.location.pathname, 'media', section)
    window.history.pushState(null, '', `#media-${section}`)
  }

  // Fetch recordings when discography tab is selected, refetching when the
  // locale or artist changes so content matches the active language. The ref
  // is keyed on both locale and artist id: without artist id, navigating from
  // one artist's discography to another's would keep the first artist's data.
  useEffect(() => {
    if (activeTab !== 'discography') {
      return
    }

    const lang = locale as 'de' | 'en'
    const fetched = fetchedLocaleRef.current
    if (fetched?.locale === lang && fetched.artistId === artist.id) {
      return
    }

    let cancelled = false

    // Clear on first fetch or when switching artists; keep existing data
    // visible while only refreshing for a new locale.
    if (fetched === null || fetched.artistId !== artist.id) {
      setRecordings([])
      setRecordingsFetched(false)
    }

    const loadRecordings = async () => {
      try {
        const data = await fetchRecordingsByArtist(artist.id.toString(), lang)
        if (!cancelled) {
          setRecordings(data.docs || [])
          fetchedLocaleRef.current = { locale: lang, artistId: artist.id }
          setRecordingsFetched(true)
        }
      } catch (err) {
        if (!cancelled) {
          // Don't record the fetch as done so a later tab visit retries.
          console.error('Failed to fetch recordings:', err)
          setRecordingsFetched(true)
        }
      }
    }

    loadRecordings()

    return () => {
      cancelled = true
    }
  }, [activeTab, artist.id, locale])

  // Extract unique roles from recordings, sorted by canonical order in RECORDING_ROLES
  const roleOrder = RECORDING_ROLES.map((r) => r.value)
  const availableRoles = Array.from(new Set(recordings.flatMap((recording) => recording.roles || []))).sort((a, b) => {
    const ai = roleOrder.indexOf(a)
    const bi = roleOrder.indexOf(b)
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
  })

  // Filter recordings by selected role
  const filteredRecordings =
    selectedRole === null
      ? recordings
      : recordings.filter((recording) => recording.roles?.includes(selectedRole as Recording['roles'][number]))

  // Repertoire is pre-populated on the artist via getArtistBySlug (order preserved)
  const repertoires = (artist.repertoire ?? []).filter((r): r is Repertoire => typeof r === 'object' && r !== null)

  // Compute loading states: show loading if tab is active but data not yet fetched
  const shouldShowRecordingsLoading = activeTab === 'discography' && !recordingsFetched

  const tabPanelId = 'artist-tab-panel'

  return (
    <div className="w-full">
      {/* Desktop/Tablet: Horizontal Tab List (ToggleGroup) */}
      <div className="mb-8 hidden border-b border-gray-200 sm:block">
        <ToggleGroup
          type="single"
          role="tablist"
          value={activeTab}
          onValueChange={(value) => value && handleTabChange(value as TabId)}
          className="-mb-px inline-flex justify-start gap-6"
        >
          {tabs.map((tab) => (
            <ToggleGroupItem
              key={tab}
              value={tab}
              role="tab"
              id={`artist-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls={tabPanelId}
              className="data-[state=on]:border-primary-yellow h-auto min-w-0 justify-start rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 text-base font-semibold text-gray-400 transition-colors hover:bg-transparent hover:text-gray-900 data-[state=on]:bg-transparent data-[state=on]:text-gray-900"
            >
              {t(`tabs.${tab}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Mobile: Dropdown (never overflows or wraps) */}
      <div className="mb-8 sm:hidden">
        <MobileTabSelect
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          getLabel={(tab) => t(`tabs.${tab}`)}
          tabPanelId={tabPanelId}
        />
      </div>

      {/* Tab Content */}
      <div
        key={activeTab}
        id={tabPanelId}
        role="tabpanel"
        aria-label={t(`tabs.${activeTab}`)}
        tabIndex={0}
        className="animate-in fade-in duration-300"
      >
        {activeTab === 'biography' && <BiographyTab content={artist.biography} quote={artist.quote} />}
        {activeTab === 'repertoire' && (
          <RepertoireTab repertoires={repertoires} loading={false} emptyMessage={t('empty.repertoire')} />
        )}
        {activeTab === 'discography' && (
          <RecordingsTab
            recordings={filteredRecordings}
            loading={shouldShowRecordingsLoading}
            emptyMessage={t('empty.discography')}
            availableRoles={availableRoles}
            selectedRole={selectedRole}
            onRoleFilterChange={setSelectedRole}
          />
        )}
        {activeTab === 'media' && (
          <MediaTab
            images={artist.galleryImages || []}
            videos={artist.videoLinks}
            emptyMessage={t('empty.media')}
            initialSection={mediaSection}
            onSectionChange={handleMediaSectionChange}
          />
        )}
        {activeTab === 'news' && (
          <NewsFeedClient
            category="news"
            artistId={artist.id.toString()}
            locale={locale}
            emptyMessage={t('empty.news')}
          />
        )}
        {activeTab === 'projects' && (
          <ProjectsTab
            projects={(artist.projects ?? []).filter((p): p is Post => typeof p === 'object' && p !== null)}
            emptyMessage={t('empty.projects')}
          />
        )}
      </div>
    </div>
  )
}

export default ArtistTabs
