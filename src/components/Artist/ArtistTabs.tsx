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
  DiscographyTab,
  NewsTab,
  ProjectsTab,
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
  const [newsLoading, setNewsLoading] = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(false)

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
    if (activeTab === 'news' && newsPosts.length === 0 && !newsLoading) {
      setNewsLoading(true)
      fetch(
        `/api/posts?where[categories][contains]=news&where[artists][equals]=${artist.id}&where[_status][equals]=published`,
      )
        .then((res) => res.json())
        .then((data) => {
          setNewsPosts(data.docs || [])
          setNewsLoading(false)
        })
        .catch((err) => {
          console.error('Failed to fetch news posts:', err)
          setNewsLoading(false)
        })
    }
  }, [activeTab, artist.id, newsPosts.length, newsLoading])

  // Fetch project posts when projects tab is selected
  useEffect(() => {
    if (activeTab === 'projects' && projectPosts.length === 0 && !projectsLoading) {
      setProjectsLoading(true)
      fetch(
        `/api/posts?where[categories][contains]=projects&where[artists][equals]=${artist.id}&where[_status][equals]=published`,
      )
        .then((res) => res.json())
        .then((data) => {
          setProjectPosts(data.docs || [])
          setProjectsLoading(false)
        })
        .catch((err) => {
          console.error('Failed to fetch project posts:', err)
          setProjectsLoading(false)
        })
    }
  }, [activeTab, artist.id, projectPosts.length, projectsLoading])

  return (
    <div className="mx-auto max-w-4xl py-12">
      {/* Desktop: Horizontal Tab List (ToggleGroup) */}
      <div className="mb-8 hidden md:block">
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(value) => value && handleTabChange(value as TabId)}
        >
          {tabs.map((tab) => (
            <ToggleGroupItem key={tab} value={tab} aria-label={t(`tabs.${tab}`)}>
              {t(`tabs.${tab}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Mobile: Dropdown (Select) */}
      <div className="mb-8 md:hidden">
        <Select value={activeTab} onValueChange={(value) => handleTabChange(value as TabId)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t(`tabs.${activeTab}`)} />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab} value={tab}>
                {t(`tabs.${tab}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg bg-gray-50 p-6">
        {activeTab === 'biography' && (
          <BiographyTab content={artist.biography} quote={artist.quote} quoteMarks={quoteMarks} />
        )}
        {activeTab === 'repertoire' && (
          <RepertoireTab content={artist.repertoire} emptyMessage={t('empty.repertoire')} />
        )}
        {activeTab === 'discography' && (
          <DiscographyTab content={artist.discography} emptyMessage={t('empty.discography')} />
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
