import { getImageByFilename } from '@/services/media.server'
import { getPageBySlug } from '@/services/page'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import ContactPageLayout from '../_components/ContactPageLayout'

export const generateStaticParams = () => {
  return [{ locale: 'de' }]
}

const KontaktPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  setRequestLocale(locale)

  const page = await getPageBySlug('kontakt', locale as 'de' | 'en')

  if (!page) {
    notFound()
  }

  const wiesbadenImage = await getImageByFilename('wiesbaden.webp')

  return <ContactPageLayout page={page} locale={locale} image={wiesbadenImage} />
}

export default KontaktPage
