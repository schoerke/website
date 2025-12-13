import PayloadRichText from '@/components/ui/PayloadRichText'
import { Image as PayloadImage } from '@/payload-types'
import config from '@/payload.config'
import { getPageBySlug } from '@/services/page'
import { setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

export const generateStaticParams = () => {
  return [{ locale: 'en' }]
}

const ContactPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  // Enable static rendering
  setRequestLocale(locale)

  const page = await getPageBySlug('contact', locale as 'de' | 'en')

  if (!page) {
    notFound()
  }

  // Fetch the Wiesbaden image
  const payload = await getPayload({ config })
  const imageResult = await payload.find({
    collection: 'images',
    where: {
      filename: {
        equals: 'wiesbaden.webp',
      },
    },
    limit: 1,
  })

  const wiesbadenImage = imageResult.docs[0] as PayloadImage | undefined

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold sm:text-6xl lg:text-7xl">{page.title}</h1>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-8 lg:gap-12">
        <div className="prose max-w-none md:w-1/2">
          <PayloadRichText content={page.content} />
        </div>
        {wiesbadenImage && (
          <div className="mb-0 md:mb-0 md:w-1/2">
            <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '4 / 3' }}>
              <Image
                src={wiesbadenImage.url || ''}
                alt={wiesbadenImage.alt || 'Wiesbaden, Germany'}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default ContactPage
