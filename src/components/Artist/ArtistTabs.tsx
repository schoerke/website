'use client'

import { fetchRecordingsByArtist } from '@/actions/recordings'
import { RECORDING_ROLES } from '@/constants/recordingOptions'
import { POST_LIST_IMAGES_POPULATE, POST_LIST_SELECT } from '@/constants/postList'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import type { Artist, Post, Recording, Repertoire } from '@/payload-types'
import { hasVisibleTextContent } from '@/utils/lexical'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  hasBiography: boolean
  hasRepertoire: boolean
  hasRecordings: boolean
  hasImages: boolean
  hasVideos: boolean
  hasNews: boolean
  hasProjects: boolean
  recordingsVersion?: string | null
  recordingsCount: number
  season?: string
}

function getAvailableTabs({
  hasBiography,
  hasRepertoire,
  hasRecordings,
  hasImages,
  hasVideos,
  hasNews,
  hasProjects,
}: Omit<ArtistTabsProps, 'artist' | 'locale' | 'recordingsVersion' | 'recordingsCount' | 'season'>): TabId[] {
  const tabAvailability: Record<TabId, boolean> = {
    biography: hasBiography,
    repertoire: hasRepertoire,
    discography: hasRecordings,
    media: hasImages || hasVideos,
    news: hasNews,
    projects: hasProjects,
  }

  return (['biography', 'repertoire', 'discography', 'media', 'news', 'projects'] as TabId[]).filter(
    (tab) => tabAvailability[tab]
  )
}

function resolveTabState(
  hash: string,
  tabs: TabId[],
  hasImages: boolean,
  hasVideos: boolean
): { tab: TabId; mediaSection: MediaSection } {
  const mediaSection = hasImages ? 'images' : 'videos'
  const mediaMatch = /^media-(images|videos)$/.exec(hash)
  if (tabs.includes('media') && (hash === 'media' || mediaMatch)) {
    const requestedSection = mediaMatch?.[1] as MediaSection | undefined
    return {
      tab: 'media',
      mediaSection:
        (requestedSection === 'images' && hasImages) || (requestedSection === 'videos' && hasVideos)
          ? requestedSection
          : mediaSection,
    }
  }
  if (tabs.includes(hash as TabId)) {
    return { tab: hash as TabId, mediaSection }
  }
  return { tab: tabs[0] ?? 'biography', mediaSection }
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
const ArtistTabs: React.FC<ArtistTabsProps> = ({
  artist,
  locale,
  hasBiography,
  hasRepertoire,
  hasRecordings,
  hasImages,
  hasVideos,
  hasNews,
  hasProjects,
  recordingsVersion,
  recordingsCount,
  season,
}) => {
  const t = useTranslations('custom.pages.artist')
  // Available tabs
  const tabs = useMemo(
    () =>
      getAvailableTabs({
        hasBiography,
        hasRepertoire,
        hasRecordings,
        hasImages,
        hasVideos,
        hasNews,
        hasProjects,
      }),
    [hasBiography, hasRepertoire, hasRecordings, hasImages, hasVideos, hasNews, hasProjects]
  )

  const [activeTab, setActiveTab] = useState<TabId>(tabs[0] ?? 'biography')
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingsFetched, setRecordingsFetched] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const fetchedLocaleRef = useRef<{
    locale: 'de' | 'en'
    artistId: number
    version: string | null
    count: number
  } | null>(null)

  // Effects synchronize activeTab after availability changes. Resolve at render
  // time too so a now-hidden tab never briefly renders its stale panel.
  const resolvedActiveTab = tabs.includes(activeTab) ? activeTab : (tabs[0] ?? 'biography')

  const [mediaSection, setMediaSection] = useState<MediaSection>('images')
  useEffect(() => {
    const resolveHash = () => {
      const state = resolveTabState(window.location.hash.slice(1), tabs, hasImages, hasVideos)
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
  }, [artist.id, hasImages, hasVideos, tabs])

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    pushHash(tab === 'media' ? `media-${mediaSection}` : tab)
  }

  const handleMediaSectionChange = (section: MediaSection) => {
    if ((section === 'images' && !hasImages) || (section === 'videos' && !hasVideos)) return
    setActiveTab('media')
    setMediaSection(section)
    pushHash(`media-${section}`)
  }

  // Fetch recordings when discography tab is selected, refetching when the
  // locale or artist changes so content matches the active language. The ref
  // is keyed on both locale and artist id: without artist id, navigating from
  // one artist's discography to another's would keep the first artist's data.
  useEffect(() => {
    if (resolvedActiveTab !== 'discography' || !hasRecordings) {
      return
    }

    const lang = locale as 'de' | 'en'
    const version = recordingsVersion ?? null
    const fetched = fetchedLocaleRef.current
    if (
      fetched?.locale === lang &&
      fetched.artistId === artist.id &&
      fetched.version === version &&
      fetched.count === recordingsCount
    ) {
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
          const docs = (data.docs || []) as Recording[]
          const roles = new Set<string>(docs.flatMap((recording) => recording.roles || []))
          setRecordings(docs)
          setSelectedRole((currentRole) => (currentRole !== null && !roles.has(currentRole) ? null : currentRole))
          fetchedLocaleRef.current = { locale: lang, artistId: artist.id, version, count: recordingsCount }
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
  }, [artist.id, hasRecordings, locale, recordingsCount, recordingsVersion, resolvedActiveTab])

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
  const repertoires = (artist.repertoire ?? []).filter(
    (repertoire): repertoire is Repertoire =>
      typeof repertoire === 'object' && repertoire !== null && hasVisibleTextContent(repertoire.content)
  )

  // Compute loading states: show loading if tab is active but data not yet fetched
  const shouldShowRecordingsLoading = resolvedActiveTab === 'discography' && !recordingsFetched

  const tabPanelId = 'artist-tab-panel'

  if (tabs.length === 0) return null

  return (
    <div className="w-full">
      {/* Desktop/Tablet: Horizontal Tab List (ToggleGroup) */}
      <div className="mb-8 hidden border-b border-gray-200 sm:block">
        <ToggleGroup
          type="single"
          role="tablist"
          value={resolvedActiveTab}
          onValueChange={(value) => value && handleTabChange(value as TabId)}
          className="-mb-px inline-flex justify-start gap-6"
        >
          {tabs.map((tab) => (
            <ToggleGroupItem
              key={tab}
              value={tab}
              role="tab"
              id={`artist-tab-${tab}`}
              aria-selected={resolvedActiveTab === tab}
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
          activeTab={resolvedActiveTab}
          onChange={handleTabChange}
          getLabel={(tab) => t(`tabs.${tab}`)}
          tabPanelId={tabPanelId}
        />
      </div>

      {/* Tab Content */}
      <div
        key={resolvedActiveTab}
        id={tabPanelId}
        role="tabpanel"
        aria-label={t(`tabs.${resolvedActiveTab}`)}
        tabIndex={0}
        className="animate-in fade-in duration-300"
      >
        {resolvedActiveTab === 'biography' && (
          <BiographyTab
            content={artist.biography}
            quote={artist.quote}
            season={season}
            quoteSource={artist.quoteSource}
            image={artist.image}
          />
        )}
        {resolvedActiveTab === 'repertoire' && (
          <RepertoireTab repertoires={repertoires} loading={false} emptyMessage={t('empty.repertoire')} />
        )}
        {resolvedActiveTab === 'discography' && (
          <RecordingsTab
            recordings={filteredRecordings}
            loading={shouldShowRecordingsLoading}
            emptyMessage={t('empty.discography')}
            availableRoles={availableRoles}
            selectedRole={selectedRole}
            onRoleFilterChange={setSelectedRole}
          />
        )}
        {resolvedActiveTab === 'media' && (
          <MediaTab
            images={artist.galleryImages || []}
            videos={artist.videoLinks}
            emptyMessage={t('empty.media')}
            section={mediaSection}
            hasImages={hasImages}
            hasVideos={hasVideos}
            onSectionChange={handleMediaSectionChange}
          />
        )}
        {resolvedActiveTab === 'news' && (
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
        {resolvedActiveTab === 'projects' && (
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
