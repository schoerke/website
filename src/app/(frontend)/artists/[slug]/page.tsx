import ContactPersons from '@/components/Artist/ContactPersons'
import ClientRichText from '@/components/ui/ClientRichText'
import config from '@/payload.config'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import type { Artist } from '@/payload-types'
import { getQuoteMarks } from '@/utils/content'

import { isEmployee } from '@/utils/collection'

function isMedia(obj: unknown): obj is { url: string } {
  return typeof obj === 'object' && obj !== null && 'url' in obj && typeof (obj as any).url === 'string'
}

import de from '@/i18n/de'
import en from '@/i18n/en'

export default async function ArtistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const artist = result.docs[0] as Artist | undefined

  if (!artist) return notFound()

  // TODO: Replace with actual locale detection from Next.js router or context
  const locale = 'de' // Default to German
  const t = locale === 'de' ? de : en
  const [openQuote, closeQuote] = getQuoteMarks(locale)

  const { name, image, quote, biography, contactPersons } = artist

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-playfair mb-6 text-6xl font-bold">{name}</h1>
      <div className="mb-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {isMedia(image) && (
          <div className="mb-0 lg:mb-0 lg:w-3/4">
            <div className="relative aspect-square w-full lg:aspect-video">
              <Image
                src={image.url}
                alt={name}
                fill
                className="rounded-lg object-cover"
                sizes="(min-width: 1024px) 600px, 100vw"
                priority
              />
            </div>
          </div>
        )}
        {contactPersons && (
          <div className="lg:w-1/4">
            <ContactPersons employees={Array.isArray(contactPersons) ? contactPersons.filter(isEmployee) : undefined} />
          </div>
        )}
      </div>
      {quote && (
        <blockquote className="border-primary-yellow border-l-4 pl-6 text-lg italic text-gray-700 dark:text-gray-200">
          {openQuote}
          {quote}
          {closeQuote}
        </blockquote>
      )}
      {biography && (
        <div className="bio-prose prose prose-lg max-w-none">
          <ClientRichText content={biography} />
        </div>
      )}
      <div className="mt-8">
        <Link
          href="/artists"
          className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 font-medium text-gray-900 transition-colors hover:bg-gray-100"
        >
          <span aria-hidden="true">&larr;</span> {t.custom.pages.artist.backButton}
        </Link>
      </div>
    </main>
  )
}
