import { getTranslations } from 'next-intl/server'

type ImpressumPageProps = {
  params: Promise<{ locale: string }>
}

const ImpressumPage = async ({ params }: ImpressumPageProps) => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'custom.pages.impressum' })

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">{t('title')}</h1>
      <p>This is the Impressum page.</p>
    </main>
  )
}

export default ImpressumPage
