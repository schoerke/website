'use client'

import EmptyRecordings from '@/components/Recording/EmptyRecordings'
import RecordingList from '@/components/Recording/RecordingList'
import RoleFilter from '@/components/Recording/RoleFilter'
import PayloadRichText from '@/components/ui/PayloadRichText'
import { Skeleton } from '@/components/ui/Skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import type { Artist, Repertoire } from '@/payload-types'
import React from 'react'
import VideoAccordion from './VideoAccordion'

// Biography Tab
interface BiographyTabProps {
  content: Artist['biography']
  quote?: string | null
}

export const BiographyTab: React.FC<BiographyTabProps> = ({ content, quote }) => {
  return (
    <div className="bio-prose prose max-w-none">
      {quote && (
        <blockquote className="border-primary-yellow mb-6 border-l-4 pl-6 text-lg italic text-gray-700 dark:text-gray-200">
          {quote}
        </blockquote>
      )}
      <PayloadRichText content={content} />
    </div>
  )
}

// Repertoire Tab
interface RepertoireTabProps {
  repertoires: Repertoire[]
  loading?: boolean
  emptyMessage: string
}

export const RepertoireTab: React.FC<RepertoireTabProps> = ({ repertoires, loading, emptyMessage }) => {
  const [selectedSection, setSelectedSection] = React.useState<number>(0)

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-4">
            <Skeleton className="mb-3 h-6 w-2/3" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (repertoires.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  const hasMultipleSections = repertoires.length > 1

  const handleValueChange = (value: string) => {
    if (value) {
      setSelectedSection(parseInt(value, 10))
    }
  }

  return (
    <div className="space-y-6">
      {/* Toggle group for section selection - only show if multiple sections */}
      {hasMultipleSections && (
        <ToggleGroup
          type="single"
          value={selectedSection.toString()}
          onValueChange={handleValueChange}
          className="mb-6 flex flex-wrap justify-start gap-2"
          aria-label="Filter repertoire by section"
        >
          {repertoires.map((repertoire, index) => (
            <ToggleGroupItem
              key={repertoire.id || index}
              value={index.toString()}
              aria-label={repertoire.title || `Section ${index + 1}`}
              className="capitalize"
            >
              {repertoire.title}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {/* Selected section content */}
      <div className="prose max-w-none">
        <PayloadRichText content={repertoires[selectedSection]?.content} />
      </div>
    </div>
  )
}

// Discography Tab
interface DiscographyTabProps {
  content: Artist['discography']
  emptyMessage: string
}

export const DiscographyTab: React.FC<DiscographyTabProps> = ({ content, emptyMessage }) => {
  if (!content || content.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {content.map((section, index) => (
        <div key={section.id || index} className="space-y-4">
          {section.role && (
            <h3 className="text-xl font-semibold capitalize text-gray-900">{section.role.replace(/_/g, ' ')}</h3>
          )}
          <div className="prose max-w-none">
            <PayloadRichText content={section.recordings} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Video Tab
interface VideoTabProps {
  videos: Artist['youtubeLinks']
  emptyMessage: string
}

export const VideoTab: React.FC<VideoTabProps> = ({ videos, emptyMessage }) => {
  return <VideoAccordion videos={videos || []} emptyMessage={emptyMessage} />
}

// Concert Dates Tab
interface ConcertDatesTabProps {
  externalCalendarURL: string
  buttonText: string
}

export const ConcertDatesTab: React.FC<ConcertDatesTabProps> = ({ externalCalendarURL, buttonText }) => {
  return (
    <div className="py-12 text-center">
      <a
        href={externalCalendarURL}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-primary-yellow text-primary-black hover:bg-primary-yellow/90 focus:ring-primary-yellow inline-flex items-center gap-2 rounded-lg px-8 py-4 text-lg font-medium shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        {buttonText}
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  )
}

// Recordings Tab
interface RecordingsTabProps {
  recordings: any[] // Recording[] from payload-types
  loading?: boolean
  emptyMessage: string
  availableRoles: string[]
  selectedRole: string | null
  onRoleFilterChange: (role: string | null) => void
}

export const RecordingsTab: React.FC<RecordingsTabProps> = ({
  recordings,
  loading,
  emptyMessage,
  availableRoles,
  selectedRole,
  onRoleFilterChange,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-b border-gray-200 py-4">
            <Skeleton className="mb-2 h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (recordings.length === 0 && selectedRole === null) {
    return <EmptyRecordings />
  }

  return (
    <>
      {availableRoles.length > 1 && (
        <RoleFilter roles={availableRoles} selected={selectedRole} onChange={onRoleFilterChange} />
      )}
      {recordings.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <RecordingList recordings={recordings} filterKey={selectedRole} />
      )}
    </>
  )
}
