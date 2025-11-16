import { getTranslations } from 'next-intl/server'

type ProjectsPageProps = {
  params: Promise<{ locale: string }>
}

const ProjectsPage = async ({ params }: ProjectsPageProps) => {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'custom.pages.projects' })

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">{t('title')}</h1>
    </main>
  )
}

export default ProjectsPage
