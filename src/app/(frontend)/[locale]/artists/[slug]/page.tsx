import ArtistTabs from '@/components/Artist/ArtistTabs'
import ContactPersons from '@/components/Artist/ContactPersons'
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

  const { name, image, contactPersons } = artist
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
        {employees && employees.length > 0 && (
          <div className="md:w-1/4">
            <ContactPersons employees={employees} />
          </div>
        )}
      </div>

      {/* Artist Tabs - Biography, Repertoire, Discography, Video, News, Projects, Concert Dates */}
      <ArtistTabs artist={artist} locale={locale} />

      <div className="mt-8">
        <Link
          href="/artists"
          className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 font-medium text-gray-900 transition-colors hover:bg-gray-100"
        >
          <span aria-hidden="true">&larr;</span> {t('backButton')}
        </Link>
      </div>
    </main>
  )
}
