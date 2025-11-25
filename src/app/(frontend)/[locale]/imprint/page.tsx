import StaticPageLayout from '../_components/StaticPageLayout'

export const generateStaticParams = () => {
  return [{ locale: 'en' }]
}

const ImprintPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  return <StaticPageLayout slug="imprint" locale={locale} />
}

export default ImprintPage
