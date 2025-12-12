import ArtistTabs from '@/components/Artist/ArtistTabs'
import ContactPersons from '@/components/Artist/ContactPersons'
import ArtistLinks from '@/components/ArtistLinks'
import { Link } from '@/i18n/navigation'
import { getArtistBySlug } from '@/services/artist'
import { isEmployee } from '@/utils/collection'
import { getImageUrl, isImageObject, isValidUrl } from '@/utils/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

export default async function ArtistDetailPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params

  // Enable static rendering
  setRequestLocale(locale)

  const artist = await getArtistBySlug(slug, locale as 'de' | 'en')

  if (!artist) return notFound()

  const t = await getTranslations({ locale, namespace: 'custom.pages.artist' })

  const {
    name,
    image,
    contactPersons,
    homepageURL,
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
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      <h1 className="font-playfair mb-6 text-6xl font-bold">{name}</h1>
      <div className="mb-8 flex flex-col gap-8 md:flex-row md:items-start md:gap-8 lg:gap-12">
        {isValidUrl(imageUrl) && (
          <div className="mb-0 md:mb-0 md:w-3/4">
            <div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
              <Image
                src={imageUrl}
                alt={name}
                fill
                className="rounded-lg object-cover"
                sizes="(min-width: 1024px) 600px, (min-width: 768px) 75vw, 100vw"
                loading="eager"
                priority
              />
            </div>
          </div>
        )}
        <div className="md:w-1/4 md:space-y-6">
          {employees && employees.length > 0 && <ContactPersons employees={employees} />}
          <ArtistLinks
            className="hidden md:block"
            homepageURL={homepageURL}
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
      <ArtistTabs artist={artist} locale={locale} />

      {/* Show ArtistLinks below tabs on small screens */}
      <div className="mt-8 border-t border-gray-200 pt-8 md:hidden">
        <ArtistLinks
          homepageURL={homepageURL}
          facebookURL={facebookURL}
          instagramURL={instagramURL}
          twitterURL={twitterURL}
          youtubeURL={youtubeURL}
          spotifyURL={spotifyURL}
          downloads={downloads}
        />
      </div>

      <div className="mt-8">
        <Link
          href="/artists"
          className="focus-visible:outline-primary-yellow after:bg-primary-yellow text-primary-black hover:text-primary-black/70 relative inline-flex items-center gap-2 transition duration-150 ease-in-out after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 hover:after:w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span aria-hidden="true">&larr;</span> {t('backButton')}
        </Link>
      </div>
    </main>
  )
}
