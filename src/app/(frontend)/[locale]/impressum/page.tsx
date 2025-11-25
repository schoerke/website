import StaticPageLayout from '../_components/StaticPageLayout'

export const generateStaticParams = () => {
  return [{ locale: 'de' }]
}

const ImpressumPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  return <StaticPageLayout slug="impressum" locale={locale} />
}

export default ImpressumPage
