import StaticPageLayout from '../_components/StaticPageLayout'

export const generateStaticParams = () => {
  return [{ locale: 'de' }]
}

const DatenschutzPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  return <StaticPageLayout slug="datenschutz" locale={locale} />
}

export default DatenschutzPage
