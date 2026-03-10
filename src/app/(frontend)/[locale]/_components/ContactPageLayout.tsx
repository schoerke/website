import PayloadRichText from '@/components/ui/PayloadRichText'
import type { Page, Image as PayloadImage } from '@/payload-types'
import Image from 'next/image'
import React from 'react'

interface ContactPageLayoutProps {
  page: Page
  locale: string
  image?: PayloadImage | null
}

const ContactPageLayout: React.FC<ContactPageLayoutProps> = ({ page, locale, image }) => {
  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold sm:text-6xl lg:text-7xl">{page.title}</h1>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-8 lg:gap-12">
        <div className="prose max-w-none md:w-1/2">
          <PayloadRichText content={page.content} locale={locale} />
        </div>
        {image && (
          <div className="mb-0 md:mb-0 md:w-1/2">
            <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '4 / 3' }}>
              <Image
                src={image.url || ''}
                alt={image.alt || 'Wiesbaden, Germany'}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContactPageLayout
