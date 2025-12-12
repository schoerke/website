'use client'

import { fetchRecordingsByArtist } from '@/actions/recordings'
import { fetchRepertoiresByArtist } from '@/actions/repertoires'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import type { Artist, Recording, Repertoire } from '@/payload-types'
import { useTranslations } from 'next-intl'
import React, { useEffect, useState } from 'react'
import NewsFeedClient from '../NewsFeed/NewsFeedClient'
import { BiographyTab, RecordingsTab, RepertoireTab, VideoTab } from './ArtistTabContent'

type TabId = 'biography' | 'repertoire' | 'discography' | 'video' | 'news' | 'projects'

interface ArtistTabsProps {
  artist: Artist
  locale: string
}

// Always return 'biography' for initial render to avoid hydration mismatch
// The hash will be read and applied in useEffect after hydration
function getInitialTab(): TabId {
  return 'biography'
}

/**
 * Internal component that manages tab state and data fetching.
 * Uses key prop on parent to reset all state when locale changes.
 */
const ArtistTabsInner: React.FC<ArtistTabsProps> = ({ artist, locale }) => {
  const t = useTranslations('custom.pages.artist')
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingsFetched, setRecordingsFetched] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [repertoires, setRepertoires] = useState<Repertoire[]>([])
  const [repertoiresFetched, setRepertoiresFetched] = useState(false)

  // Available tabs
  const tabs: TabId[] = ['biography', 'repertoire', 'discography', 'video', 'news', 'projects']

  // Read hash from URL after hydration to set initial tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1) as TabId
      if (hash && tabs.includes(hash)) {
        setActiveTab(hash)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once after mount

  // Update URL hash when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    window.history.pushState(null, '', `#${tab}`)
  }

  // Fetch recordings when discography tab is selected
  useEffect(() => {
    if (activeTab !== 'discography' || recordingsFetched) {
      return
    }

    let cancelled = false

    const loadRecordings = async () => {
      try {
        const data = await fetchRecordingsByArtist(artist.id.toString(), locale as 'de' | 'en')
        if (!cancelled) {
          setRecordings(data.docs || [])
          setRecordingsFetched(true)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch recordings:', err)
          setRecordingsFetched(true)
        }
      }
    }

    loadRecordings()

    return () => {
      cancelled = true
    }
  }, [activeTab, artist.id, locale, recordingsFetched])

  // Fetch repertoires when repertoire tab is selected
  useEffect(() => {
    if (activeTab !== 'repertoire' || repertoiresFetched) {
      return
    }

    let cancelled = false

    const loadRepertoires = async () => {
      try {
        const data = await fetchRepertoiresByArtist(artist.id.toString(), locale as 'de' | 'en')
        if (!cancelled) {
          setRepertoires(data.docs || [])
          setRepertoiresFetched(true)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch repertoires:', err)
          setRepertoiresFetched(true)
        }
      }
    }

    loadRepertoires()

    return () => {
      cancelled = true
    }
  }, [activeTab, artist.id, locale, repertoiresFetched])

  // Extract unique roles from recordings
  const availableRoles = Array.from(new Set(recordings.flatMap((recording) => recording.roles || []))).sort()

  // Filter recordings by selected role
  const filteredRecordings =
    selectedRole === null
      ? recordings
      : recordings.filter((recording) => recording.roles?.includes(selectedRole as Recording['roles'][number]))

  // Compute loading states: show loading if tab is active but data not yet fetched
  const shouldShowRepertoireLoading = activeTab === 'repertoire' && !repertoiresFetched
  const shouldShowRecordingsLoading = activeTab === 'discography' && !recordingsFetched

  return (
    <div className="w-full">
      {/* Desktop: Horizontal Tab List (ToggleGroup) */}
      <div className="mb-8 hidden lg:block">
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(value) => value && handleTabChange(value as TabId)}
          className="inline-flex justify-start gap-0"
        >
          {tabs.map((tab) => (
            <ToggleGroupItem
              key={tab}
              value={tab}
              aria-label={t(`tabs.${tab}`)}
              className="data-[state=on]:border-primary-yellow justify-start rounded-none border-b-4 border-transparent bg-white px-5 py-2.5 text-lg font-medium uppercase text-gray-700 transition-colors hover:bg-gray-100 data-[state=on]:text-gray-900"
            >
              {t(`tabs.${tab}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Mobile/Tablet: Wrapped Horizontal Tabs */}
      <div className="mb-8 lg:hidden">
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(value) => value && handleTabChange(value as TabId)}
          className="flex flex-wrap justify-start gap-y-4"
        >
          {tabs.map((tab) => (
            <ToggleGroupItem
              key={tab}
              value={tab}
              aria-label={t(`tabs.${tab}`)}
              className="data-[state=on]:border-primary-yellow justify-start rounded-none border-b-4 border-transparent bg-white px-5 py-2.5 text-lg font-medium uppercase text-gray-700 transition-colors hover:bg-gray-100 data-[state=on]:text-gray-900"
            >
              {t(`tabs.${tab}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Tab Content */}
      <div key={activeTab} className="animate-in fade-in duration-300">
        {activeTab === 'biography' && <BiographyTab content={artist.biography} quote={artist.quote} />}
        {activeTab === 'repertoire' && (
          <RepertoireTab
            repertoires={repertoires}
            loading={shouldShowRepertoireLoading}
            emptyMessage={t('empty.repertoire')}
          />
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
        {activeTab === 'video' && <VideoTab videos={artist.youtubeLinks} emptyMessage={t('empty.video')} />}
        {activeTab === 'news' && (
          <NewsFeedClient category="news" artistId={artist.id.toString()} emptyMessage={t('empty.news')} />
        )}
        {activeTab === 'projects' && (
          <NewsFeedClient category="projects" artistId={artist.id.toString()} emptyMessage={t('empty.projects')} />
        )}
      </div>
    </div>
  )
}

/**
 * ArtistTabs component with locale-based reset.
 * Uses key prop to reset all internal state when locale changes.
 */
const ArtistTabs: React.FC<ArtistTabsProps> = ({ artist, locale }) => {
  return <ArtistTabsInner key={locale} artist={artist} locale={locale} />
}

export default ArtistTabs
