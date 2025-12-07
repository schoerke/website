import { getTranslations } from 'next-intl/server'

type HomePageProps = {
  params: Promise<{ locale: string }>
}

const HomePage = async ({ params }: HomePageProps) => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'custom.pages.home' })

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      <h1 className="font-playfair mb-8 text-5xl font-bold sm:mb-12">{t('title')}</h1>
    </main>
  )
}

export default HomePage
