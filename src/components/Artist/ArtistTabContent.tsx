import EmptyRecordings from '@/components/Recording/EmptyRecordings'
import RecordingList from '@/components/Recording/RecordingList'
import RoleFilter from '@/components/Recording/RoleFilter'
import PayloadRichText from '@/components/ui/PayloadRichText'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Artist, Post } from '@/payload-types'
import PostList from './PostList'
import VideoAccordion from './VideoAccordion'

// Biography Tab
interface BiographyTabProps {
  content: Artist['biography']
  quote?: string | null
  quoteMarks?: [string, string]
}

export const BiographyTab: React.FC<BiographyTabProps> = ({ content, quote, quoteMarks }) => {
  const [openQuote, closeQuote] = quoteMarks || ['', '']

  return (
    <div className="bio-prose prose max-w-none">
      {quote && (
        <blockquote className="border-primary-yellow mb-6 border-l-4 pl-6 text-lg italic text-gray-700 dark:text-gray-200">
          {openQuote}
          {quote}
          {closeQuote}
        </blockquote>
      )}
      <PayloadRichText content={content} />
    </div>
  )
}

// Repertoire Tab
interface RepertoireTabProps {
  content: Artist['repertoire']
  emptyMessage: string
}

export const RepertoireTab: React.FC<RepertoireTabProps> = ({ content, emptyMessage }) => {
  if (!content) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="prose max-w-none">
      <PayloadRichText content={content} />
    </div>
  )
}

// Discography Tab
interface DiscographyTabProps {
  content: Artist['discography']
  emptyMessage: string
}

export const DiscographyTab: React.FC<DiscographyTabProps> = ({ content, emptyMessage }) => {
  if (!content) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="prose max-w-none">
      <PayloadRichText content={content} />
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

// News Tab
interface NewsTabProps {
  posts: Post[]
  loading?: boolean
  emptyMessage: string
}

export const NewsTab: React.FC<NewsTabProps> = ({ posts, loading, emptyMessage }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-6">
            <Skeleton className="h-32 w-32 flex-shrink-0 rounded-lg" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <PostList posts={posts} emptyMessage={emptyMessage} />
}

// Projects Tab
interface ProjectsTabProps {
  posts: Post[]
  loading?: boolean
  emptyMessage: string
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({ posts, loading, emptyMessage }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-6">
            <Skeleton className="h-32 w-32 flex-shrink-0 rounded-lg" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <PostList posts={posts} emptyMessage={emptyMessage} />
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
