import ContactPageLayout from '../_components/ContactPageLayout'
import { getContactPageData } from '../_lib/contactPageData'
import { getTranslations, setRequestLocale } from 'next-intl/server'

export const generateStaticParams = () => {
  return [{ locale: 'de' }]
}

const KontaktPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  setRequestLocale(locale)

  const [t, { teamPage, employees, wiesbadenImage, dogImage, dogName, dogTitle, phoneLabel, mobileLabel }] =
    await Promise.all([
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
      dogImage={dogImage}
      dogName={dogName}
      dogTitle={dogTitle}
      phoneLabel={phoneLabel}
      mobileLabel={mobileLabel}
    />
  )
}

export default KontaktPage
