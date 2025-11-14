import PayloadRichText from '@/components/ui/PayloadRichText'
import config from '@/payload.config'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

export default async function ArtistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const artist = result.docs[0]
  if (!artist) return notFound()

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-playfair mb-6 text-6xl font-bold">{artist.name}</h1>
      {artist.image && typeof artist.image === 'object' && artist.image.url && (
        <div className="mb-6">
          <Image
            src={artist.image.url}
            alt={artist.name}
            width={600}
            height={600}
            className="h-auto w-full rounded-lg object-cover"
          />
        </div>
      )}
      {artist.biography && (
        <div className="prose prose-lg max-w-none">
          <PayloadRichText content={artist.biography} />
        </div>
      )}
    </main>
  )
}
