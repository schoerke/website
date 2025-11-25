import StaticPageLayout from '../_components/StaticPageLayout'

export const generateStaticParams = () => {
  return [{ locale: 'de' }]
}

const KontaktPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  return <StaticPageLayout slug="kontakt" locale={locale} />
}

export default KontaktPage
