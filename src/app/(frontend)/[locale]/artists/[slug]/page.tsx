import ArtistTabs from '@/components/Artist/ArtistTabs'
import ContactPersons, { MobileContactPersonsSection } from '@/components/Artist/ContactPersons'
import ArtistLinks from '@/components/ArtistLinks'
import ImageWithSkeleton from '@/components/ui/ImageWithSkeleton'
import SchoerkeLink from '@/components/ui/SchoerkeLink'
import { getArtistBySlug, getArtistSlugs } from '@/services/artist'
import { getNewsPostCountByArtist } from '@/services/post'
import { isEmployee } from '@/utils/collection'
import { getImageUrl, isImageObject, isValidUrl } from '@/utils/image'
import { getConcertSeason } from '@/utils/season'
import { ChevronLeft } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const revalidate = 86400

export async function generateStaticParams() {
  try {
    const slugs = await getArtistSlugs()
    const locales = ['de', 'en'] as const
    return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })))
  } catch (error) {
    console.warn('Failed to generate static params for artists:', error)
    return []
  }
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params

  // Enable static rendering
  setRequestLocale(locale)

  const artist = await getArtistBySlug(slug, locale as 'de' | 'en')

  if (!artist) return notFound()

  const newsCount = await getNewsPostCountByArtist(artist.id, locale as 'de' | 'en')

  const hasNews = newsCount > 0
  const hasProjects = (artist.projects ?? []).some((p) => typeof p === 'object' && p !== null)
  const season = getConcertSeason(new Date())

  const t = await getTranslations({ locale, namespace: 'custom.pages.artist' })

  const {
    name,
    image,
    contactPersons,
    homepageURL,
    externalCalendarURL,
    facebookURL,
    instagramURL,
    twitterURL,
    youtubeURL,
    spotifyURL,
    downloads,
  } = artist
  const imageUrl = isImageObject(image) ? getImageUrl(image) : null

  // Filter contactPersons to only include fully populated Employee objects
  // With depth: 1, contactPersons are populated as Employee objects (or numbers if refs broken)
  const employees = contactPersons && Array.isArray(contactPersons) ? contactPersons.filter(isEmployee) : undefined

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      <h1 className="font-playfair mb-6 text-4xl font-bold sm:text-5xl">{name}</h1>
      <div className="mb-8 flex flex-col gap-8 md:flex-row md:items-start md:gap-8 lg:gap-12">
        {isValidUrl(imageUrl) && (
          <div className="mb-0 md:mb-0 md:w-3/4">
            <ImageWithSkeleton
              src={imageUrl}
              alt={name}
              className="rounded-lg"
              sizes="(min-width: 1024px) min(75vw, 912px), (min-width: 768px) 75vw, 100vw"
              priority
              quality={80}
              objectPosition={
                typeof image === 'object' && image !== null && image.focalX != null && image.focalY != null
                  ? `${image.focalX}% ${image.focalY}%`
                  : undefined
              }
            />
          </div>
        )}
        <div className="hidden sm:block md:w-1/4 md:space-y-6">
          {employees && employees.length > 0 && <ContactPersons employees={employees} />}
          <ArtistLinks
            className="hidden md:block"
            homepageURL={homepageURL}
            externalCalendarURL={externalCalendarURL}
            facebookURL={facebookURL}
            instagramURL={instagramURL}
            twitterURL={twitterURL}
            youtubeURL={youtubeURL}
            spotifyURL={spotifyURL}
            downloads={downloads}
          />
        </div>
      </div>

      {/* Artist Tabs - Biography, Repertoire, Discography, Video, News, Projects, Concert Dates */}
      <ArtistTabs artist={artist} locale={locale} hasNews={hasNews} hasProjects={hasProjects} season={season} />

      {/* Contact persons on mobile: shown below tabs (always visible regardless of active tab), above links/downloads */}
      {employees && employees.length > 0 && (
        <div className="mt-8 border-t border-gray-200 pt-8 sm:hidden">
          <MobileContactPersonsSection employees={employees} />
        </div>
      )}

      {/* Show ArtistLinks below tabs on small screens */}
      <div className="mt-8 border-t border-gray-200 pt-8 md:hidden">
        <ArtistLinks
          homepageURL={homepageURL}
          externalCalendarURL={externalCalendarURL}
          facebookURL={facebookURL}
          instagramURL={instagramURL}
          twitterURL={twitterURL}
          youtubeURL={youtubeURL}
          spotifyURL={spotifyURL}
          downloads={downloads}
        />
      </div>

      <div className="mt-8">
        <SchoerkeLink href="/artists" variant="with-icon" className="font-semibold">
          <ChevronLeft className="h-4 w-4" aria-hidden={true} />
          <span className="after:bg-primary-yellow relative after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 group-hover:after:w-full">
            {t('backButton')}
          </span>
        </SchoerkeLink>
      </div>
    </div>
  )
}
