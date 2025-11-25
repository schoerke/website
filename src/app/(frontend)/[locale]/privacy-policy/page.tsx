import StaticPageLayout from '../_components/StaticPageLayout'

export const generateStaticParams = () => {
  return [{ locale: 'en' }]
}

const PrivacyPolicyPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  return <StaticPageLayout slug="privacy-policy" locale={locale} />
}

export default PrivacyPolicyPage
