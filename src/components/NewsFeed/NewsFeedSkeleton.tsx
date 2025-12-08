import { Skeleton } from '@/components/ui/Skeleton'

interface NewsFeedSkeletonProps {
  count?: number
  showPagination?: boolean
}

const NewsFeedSkeleton: React.FC<NewsFeedSkeletonProps> = ({ count = 3, showPagination = true }) => {
  return (
    <div className="space-y-8">
      {/* Posts per page selector skeleton (top) */}
      {showPagination && (
        <div className="flex justify-end">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      )}

      {/* Posts list skeleton */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: count }, (_, i) => (
          <article key={i} className="grid grid-cols-1 gap-4 py-6 first:pt-0 lg:grid-cols-[140px_1fr_auto] lg:gap-8">
            {/* Date column - only visible on large screens */}
            <div className="hidden lg:block">
              <Skeleton className="h-5 w-28" />
            </div>

            {/* Content column */}
            <div className="flex gap-4 sm:gap-6 lg:contents">
              {/* Image skeleton - end on large screens */}
              <Skeleton className="h-20 w-20 flex-shrink-0 sm:h-28 sm:w-28 lg:order-last" />

              {/* Text content skeleton */}
              <div className="flex flex-1 flex-col justify-center space-y-2">
                <Skeleton className="h-6 w-3/4 sm:h-7" />
                <Skeleton className="hidden h-4 w-full sm:block" />
                <Skeleton className="hidden h-4 w-2/3 sm:block" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Pagination skeleton (bottom) */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  )
}

export default NewsFeedSkeleton
