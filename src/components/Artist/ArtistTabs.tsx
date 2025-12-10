'use client'

import { fetchRecordingsByArtist } from '@/actions/recordings'
import { fetchRepertoiresByArtist } from '@/actions/repertoires'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import type { Artist, Recording, Repertoire } from '@/payload-types'
import { useTranslations } from 'next-intl'
import React, { useEffect, useState } from 'react'
import NewsFeedClient from '../NewsFeed/NewsFeedClient'
import { BiographyTab, ConcertDatesTab, RecordingsTab, RepertoireTab, VideoTab } from './ArtistTabContent'

type TabId = 'biography' | 'repertoire' | 'discography' | 'video' | 'news' | 'projects' | 'concertDates'

interface ArtistTabsProps {
  artist: Artist
  locale: string
}

function getInitialTab(hasCalendar: boolean): TabId {
  if (typeof window === 'undefined') return 'biography'
  const hash = window.location.hash.slice(1) as TabId
  const validTabs: TabId[] = [
    'biography',
    'repertoire',
    'discography',
    'video',
    'news',
    'projects',
    ...(hasCalendar ? (['concertDates'] as const) : []),
  ]
  return hash && validTabs.includes(hash) ? hash : 'biography'
}

/**
 * Internal component that manages tab state and data fetching.
 * Uses key prop on parent to reset all state when locale changes.
 */
const ArtistTabsInner: React.FC<ArtistTabsProps> = ({ artist, locale }) => {
  const t = useTranslations('custom.pages.artist')
  const [activeTab, setActiveTab] = useState<TabId>(() => getInitialTab(!!artist.externalCalendarURL))
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(false)
  const [recordingsFetched, setRecordingsFetched] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [repertoires, setRepertoires] = useState<Repertoire[]>([])
  const [repertoiresLoading, setRepertoiresLoading] = useState(false)
  const [repertoiresFetched, setRepertoiresFetched] = useState(false)

  // Available tabs (Concert Dates is conditional)
  const tabs: TabId[] = [
    'biography',
    'repertoire',
    'discography',
    'video',
    'news',
    'projects',
    ...(artist.externalCalendarURL ? (['concertDates'] as const) : []),
  ]

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
      setRecordingsLoading(true)
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
      } finally {
        if (!cancelled) {
          setRecordingsLoading(false)
        }
      }
    }

    loadRecordings()

    return () => {
      cancelled = true
    }
  }, [activeTab, artist.id, recordingsFetched, locale])

  // Fetch repertoires when repertoire tab is selected
  useEffect(() => {
    if (activeTab !== 'repertoire' || repertoiresFetched) {
      return
    }

    let cancelled = false

    const loadRepertoires = async () => {
      setRepertoiresLoading(true)
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
      } finally {
        if (!cancelled) {
          setRepertoiresLoading(false)
        }
      }
    }

    loadRepertoires()

    return () => {
      cancelled = true
    }
  }, [activeTab, artist.id, repertoiresFetched, locale])

  // Extract unique roles from recordings
  const availableRoles = Array.from(new Set(recordings.flatMap((recording) => recording.roles || []))).sort()

  // Filter recordings by selected role
  const filteredRecordings =
    selectedRole === null
      ? recordings
      : recordings.filter((recording) => recording.roles?.includes(selectedRole as Recording['roles'][number]))

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
          <RepertoireTab repertoires={repertoires} loading={repertoiresLoading} emptyMessage={t('empty.repertoire')} />
        )}
        {activeTab === 'discography' && (
          <RecordingsTab
            recordings={filteredRecordings}
            loading={recordingsLoading}
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
        {activeTab === 'concertDates' && artist.externalCalendarURL && (
          <ConcertDatesTab externalCalendarURL={artist.externalCalendarURL} buttonText={t('concertDates.button')} />
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
