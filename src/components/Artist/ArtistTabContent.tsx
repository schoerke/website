import PayloadRichText from '@/components/ui/PayloadRichText'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Artist, Post } from '@/payload-types'
import PostList from './PostList'
import VideoAccordion from './VideoAccordion'

// Biography Tab
interface BiographyTabProps {
  content: Artist['biography']
}

export const BiographyTab: React.FC<BiographyTabProps> = ({ content }) => {
  return (
    <div className="prose max-w-none">
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
          <div key={i} className="flex gap-6 rounded-lg bg-white p-6 shadow-md">
            <Skeleton className="h-32 w-32 flex-shrink-0" />
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
          <div key={i} className="flex gap-6 rounded-lg bg-white p-6 shadow-md">
            <Skeleton className="h-32 w-32 flex-shrink-0" />
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
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-medium text-white shadow-md transition-colors hover:bg-blue-700"
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
