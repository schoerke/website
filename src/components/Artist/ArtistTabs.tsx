'use client'

import { fetchRecordingsByArtist } from '@/actions/recordings'
import { RECORDING_ROLES } from '@/constants/recordingOptions'
import { POST_LIST_IMAGES_POPULATE, POST_LIST_SELECT } from '@/constants/postList'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import type { Artist, Post, Recording, Repertoire } from '@/payload-types'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React, { useEffect, useRef, useState } from 'react'
import NewsFeedClient from '../NewsFeed/NewsFeedClient'
import { BiographyTab, MediaTab, ProjectsTab, RecordingsTab, RepertoireTab } from './ArtistTabContent'
import type { MediaSection, TabId } from './types'

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
  season?: string
}

// Always return 'biography' for initial render to avoid hydration mismatch
// The hash will be read and applied in useEffect after hydration
function getInitialTab(): TabId {
  return 'biography'
}

function getAvailableTabs(hasNews: boolean, hasProjects: boolean): TabId[] {
  return (['biography', 'repertoire', 'discography', 'media', 'news', 'projects'] as TabId[]).filter((tab) => {
    if (tab === 'news') return hasNews
    if (tab === 'projects') return hasProjects
    return true
  })
}

function resolveTabState(hash: string, tabs: TabId[]): { tab: TabId; mediaSection: MediaSection } {
  const mediaMatch = /^media-(images|videos)$/.exec(hash)
  if (mediaMatch) {
    return { tab: 'media', mediaSection: mediaMatch[1] as MediaSection }
  }
  if (hash !== 'media' && tabs.includes(hash as TabId)) {
    return { tab: hash as TabId, mediaSection: 'images' }
  }
  return { tab: 'biography', mediaSection: 'images' }
}

// Must use history.pushState, not `window.location.hash =` — Next patches
// pushState/replaceState to track history externally; a raw hash assignment
// bypasses that, desyncing router.back() from another page (e.g. BackButton).
function pushHash(hash: string): void {
  if (window.location.hash === `#${hash}`) return
  window.history.pushState(null, '', `#${hash}`)
}

/**
 * Manages tab state and data fetching. Active tab and media section are owned by
 * the URL hash; locale-dependent recordings are refetched for the active tab.
 */
const ArtistTabs: React.FC<ArtistTabsProps> = ({ artist, locale, hasNews, hasProjects, season }) => {
  const t = useTranslations('custom.pages.artist')
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingsFetched, setRecordingsFetched] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const fetchedLocaleRef = useRef<{ locale: 'de' | 'en'; artistId: number } | null>(null)

  // Available tabs
  const tabs = getAvailableTabs(hasNews, hasProjects)

  const [mediaSection, setMediaSection] = useState<MediaSection>('images')
  useEffect(() => {
    const resolveHash = () => {
      const state = resolveTabState(window.location.hash.slice(1), getAvailableTabs(hasNews, hasProjects))
      setActiveTab(state.tab)
      setMediaSection(state.mediaSection)
    }

    resolveHash()
    window.addEventListener('popstate', resolveHash)
    window.addEventListener('hashchange', resolveHash)
    return () => {
      window.removeEventListener('popstate', resolveHash)
      window.removeEventListener('hashchange', resolveHash)
    }
  }, [artist.id, hasNews, hasProjects])

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    pushHash(tab === 'media' ? `media-${mediaSection}` : tab)
  }

  const handleMediaSectionChange = (section: MediaSection) => {
    setActiveTab('media')
    setMediaSection(section)
    pushHash(`media-${section}`)
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
          setRecordings((data.docs || []) as Recording[])
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
        {activeTab === 'biography' && (
          <BiographyTab
            content={artist.biography}
            quote={artist.quote}
            season={season}
            quoteSource={artist.quoteSource}
            image={artist.image}
          />
        )}
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
            section={mediaSection}
            onSectionChange={handleMediaSectionChange}
          />
        )}
        {activeTab === 'news' && (
          <NewsFeedClient
            category="news"
            artistId={artist.id.toString()}
            locale={locale}
            emptyMessage={t('empty.news')}
            select={POST_LIST_SELECT}
            populate={POST_LIST_IMAGES_POPULATE}
            limit={25}
            showSearch={false}
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
