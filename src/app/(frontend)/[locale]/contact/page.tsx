import StaticPageLayout from '../_components/StaticPageLayout'

export const generateStaticParams = () => {
  return [{ locale: 'en' }]
}

const ContactPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  return <StaticPageLayout slug="contact" locale={locale} />
}

export default ContactPage
