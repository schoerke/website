'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
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

  // Get quote marks for the current locale
  const quoteMarks = getQuoteMarks(locale)

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
        `/api/posts?where[categories][contains]=news&where[artists][equals]=${artist.id}&where[_status][equals]=published`,
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
  }, [activeTab, artist.id, newsFetched, newsLoading])

  // Fetch project posts when projects tab is selected
  useEffect(() => {
    if (activeTab === 'projects' && !projectsFetched && !projectsLoading) {
      setProjectsLoading(true)
      fetch(
        `/api/posts?where[categories][contains]=projects&where[artists][equals]=${artist.id}&where[_status][equals]=published`,
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
  }, [activeTab, artist.id, projectsFetched, projectsLoading])

  // Fetch recordings when discography tab is selected
  useEffect(() => {
    if (activeTab === 'discography' && !recordingsFetched && !recordingsLoading) {
      setRecordingsLoading(true)
      fetch(`/api/recordings?where[artistRoles.artist][equals]=${artist.id}&where[_status][equals]=published`)
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
  }, [activeTab, artist.id, recordingsFetched, recordingsLoading])

  return (
    <div className="w-full">
      {/* Desktop: Horizontal Tab List (ToggleGroup) */}
      <div className="mb-8 hidden md:block">
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(value) => value && handleTabChange(value as TabId)}
          className="inline-flex justify-start gap-0 bg-gray-100 p-1"
        >
          {tabs.map((tab) => (
            <ToggleGroupItem
              key={tab}
              value={tab}
              aria-label={t(`tabs.${tab}`)}
              className="data-[state=on]:bg-primary-yellow data-[state=on]:text-primary-black rounded-none px-5 py-2.5 text-lg font-medium uppercase text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900 data-[state=on]:shadow-sm"
            >
              {t(`tabs.${tab}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Mobile: Dropdown (Select) */}
      <div className="mb-8 md:hidden">
        <Select value={activeTab} onValueChange={(value) => handleTabChange(value as TabId)}>
          <SelectTrigger className="bg-primary-yellow text-primary-black w-full text-lg font-medium uppercase">
            <SelectValue placeholder={t(`tabs.${activeTab}`)} />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab} value={tab} className="uppercase">
                {t(`tabs.${tab}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <RecordingsTab recordings={recordings} loading={recordingsLoading} emptyMessage={t('empty.discography')} />
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
