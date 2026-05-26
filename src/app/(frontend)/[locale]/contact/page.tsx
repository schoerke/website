import ContactPageLayout from '../_components/ContactPageLayout'
import { getContactPageData } from '../_lib/contactPageData'
import { getTranslations, setRequestLocale } from 'next-intl/server'

export const generateStaticParams = () => {
  return [{ locale: 'en' }]
}

const ContactPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  setRequestLocale(locale)

  const [t, { teamPage, employees, wiesbadenImage, phoneLabel, mobileLabel }] = await Promise.all([
    getTranslations({ locale, namespace: 'custom.pages.contact' }),
    getContactPageData(locale as 'de' | 'en'),
  ])

  return (
    <ContactPageLayout
      title={t('title')}
      locale={locale as 'de' | 'en'}
      image={wiesbadenImage}
      teamPage={teamPage}
      employees={employees}
      phoneLabel={phoneLabel}
      mobileLabel={mobileLabel}
    />
  )
}

export default ContactPage
