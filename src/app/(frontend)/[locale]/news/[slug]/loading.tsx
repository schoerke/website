export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="animate-pulse">
        {/* Back button skeleton */}
        <div className="mb-8 h-5 w-24 rounded bg-gray-200"></div>

        {/* Header skeleton */}
        <div className="mb-8">
          <div className="mb-4 h-12 w-3/4 rounded bg-gray-200"></div>
          <div className="h-4 w-32 rounded bg-gray-200"></div>
        </div>

        {/* Image skeleton */}
        <div className="mb-8 aspect-video w-full rounded-lg bg-gray-200"></div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-full rounded bg-gray-200"></div>
          <div className="h-4 w-full rounded bg-gray-200"></div>
          <div className="h-4 w-5/6 rounded bg-gray-200"></div>
          <div className="h-4 w-full rounded bg-gray-200"></div>
          <div className="h-4 w-4/5 rounded bg-gray-200"></div>
        </div>

        {/* Bottom link skeleton */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="h-10 w-32 rounded bg-gray-200"></div>
        </div>
      </div>
    </main>
  )
}
