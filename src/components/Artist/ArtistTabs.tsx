'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import type { Artist, Post } from '@/payload-types'
import { getQuoteMarks } from '@/utils/content'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import {
  BiographyTab,
  ConcertDatesTab,
  NewsTab,
  ProjectsTab,
  RecordingsTab,
  RepertoireTab,
  VideoTab,
} from './ArtistTabContent'

type TabId = 'biography' | 'repertoire' | 'discography' | 'video' | 'news' | 'projects' | 'concertDates'

interface ArtistTabsProps {
  artist: Artist
  locale: string
}

const ArtistTabs: React.FC<ArtistTabsProps> = ({ artist, locale }) => {
  const t = useTranslations('custom.pages.artist')
  const [activeTab, setActiveTab] = useState<TabId>('biography')
  const [newsPosts, setNewsPosts] = useState<Post[]>([])
  const [projectPosts, setProjectPosts] = useState<Post[]>([])
  const [recordings, setRecordings] = useState<any[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [recordingsLoading, setRecordingsLoading] = useState(false)
  const [newsFetched, setNewsFetched] = useState(false)
  const [projectsFetched, setProjectsFetched] = useState(false)
  const [recordingsFetched, setRecordingsFetched] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  // Get quote marks for the current locale
  const quoteMarks = getQuoteMarks(locale)

  // Reset fetched flags when locale changes
  useEffect(() => {
    setNewsFetched(false)
    setProjectsFetched(false)
    setRecordingsFetched(false)
    setSelectedRole(null)
  }, [locale])

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

  // Read URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1) as TabId
    if (hash && tabs.includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  // Update URL hash when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    window.history.pushState(null, '', `#${tab}`)
  }

  // Fetch news posts when news tab is selected
  useEffect(() => {
    if (activeTab === 'news' && !newsFetched && !newsLoading) {
      setNewsLoading(true)
      fetch(
        `/api/posts?where[categories][contains]=news&where[artists][equals]=${artist.id}&where[_status][equals]=published&locale=${locale}`,
      )
        .then((res) => res.json())
        .then((data) => {
          setNewsPosts(data.docs || [])
          setNewsLoading(false)
          setNewsFetched(true)
        })
        .catch((err) => {
          console.error('Failed to fetch news posts:', err)
          setNewsLoading(false)
          setNewsFetched(true)
        })
    }
  }, [activeTab, artist.id, newsFetched, newsLoading, locale])

  // Fetch project posts when projects tab is selected
  useEffect(() => {
    if (activeTab === 'projects' && !projectsFetched && !projectsLoading) {
      setProjectsLoading(true)
      fetch(
        `/api/posts?where[categories][contains]=projects&where[artists][equals]=${artist.id}&where[_status][equals]=published&locale=${locale}`,
      )
        .then((res) => res.json())
        .then((data) => {
          setProjectPosts(data.docs || [])
          setProjectsLoading(false)
          setProjectsFetched(true)
        })
        .catch((err) => {
          console.error('Failed to fetch project posts:', err)
          setProjectsLoading(false)
          setProjectsFetched(true)
        })
    }
  }, [activeTab, artist.id, projectsFetched, projectsLoading, locale])

  // Fetch recordings when discography tab is selected
  useEffect(() => {
    if (activeTab === 'discography' && !recordingsFetched && !recordingsLoading) {
      setRecordingsLoading(true)
      fetch(
        `/api/recordings?where[artists][equals]=${artist.id}&where[_status][equals]=published&locale=${locale}&limit=1000`,
      )
        .then((res) => res.json())
        .then((data) => {
          setRecordings(data.docs || [])
          setRecordingsLoading(false)
          setRecordingsFetched(true)
        })
        .catch((err) => {
          console.error('Failed to fetch recordings:', err)
          setRecordingsLoading(false)
          setRecordingsFetched(true)
        })
    }
  }, [activeTab, artist.id, recordingsFetched, recordingsLoading, locale])

  // Extract unique roles from recordings
  const availableRoles = Array.from(new Set(recordings.flatMap((recording) => recording.roles || []))).sort()

  // Filter recordings by selected role
  const filteredRecordings =
    selectedRole === null ? recordings : recordings.filter((recording) => recording.roles?.includes(selectedRole))

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
        {activeTab === 'biography' && (
          <BiographyTab content={artist.biography} quote={artist.quote} quoteMarks={quoteMarks} />
        )}
        {activeTab === 'repertoire' && (
          <RepertoireTab content={artist.repertoire} emptyMessage={t('empty.repertoire')} />
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
        {activeTab === 'news' && <NewsTab posts={newsPosts} loading={newsLoading} emptyMessage={t('empty.news')} />}
        {activeTab === 'projects' && (
          <ProjectsTab posts={projectPosts} loading={projectsLoading} emptyMessage={t('empty.projects')} />
        )}
        {activeTab === 'concertDates' && artist.externalCalendarURL && (
          <ConcertDatesTab externalCalendarURL={artist.externalCalendarURL} buttonText={t('concertDates.button')} />
        )}
      </div>
    </div>
  )
}

export default ArtistTabs
