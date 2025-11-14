import ClientRichText from '@/components/ui/ClientRichText'
import config from '@/payload.config'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

export default async function ArtistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
  })
   const artist = result.docs[0]

   // Localized quote support
   // TODO: Replace with actual locale detection from Next.js router or context
   const locale = 'de' // Default to German
   const quote = (artist.quote && typeof artist.quote === 'object')
     ? artist.quote[locale] || artist.quote.en || artist.quote.de
     : artist.quote

  if (!artist) return notFound()

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-playfair mb-6 text-6xl font-bold">{artist.name}</h1>
      <div className="mb-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        {artist.image && typeof artist.image === 'object' && artist.image.url && (
          <div className="mb-0 lg:mb-0 lg:w-1/2">
            <Image
              src={artist.image.url}
              alt={artist.name}
              width={600}
              height={600}
              className="h-auto w-full rounded-lg object-cover"
            />
          </div>
        )}

      </div>
      {quote && (
        <blockquote className="border-l-4 border-primary-yellow pl-6 text-lg italic text-gray-700 dark:text-gray-200">
          {locale === 'de' ? '„' : '“'}{quote}{locale === 'de' ? '“' : '”'}
        </blockquote>
      )}
      {artist.biography && (
        <div className="prose prose-lg max-w-none bio-prose">
          <ClientRichText content={artist.biography} />
        </div>
      )}
    </main>
  )
}
