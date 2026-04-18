import { getContactPageData } from '../_lib/contactPageData'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import ContactPageLayout from '../_components/ContactPageLayout'

export const generateStaticParams = () => {
  return [{ locale: 'en' }]
}

const ContactPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  setRequestLocale(locale)

  const { page, teamPage, employees, wiesbadenImage, phoneLabel, mobileLabel } = await getContactPageData(
    'contact',
    locale as 'de' | 'en'
  )

  if (!page) {
    notFound()
  }

  return (
    <ContactPageLayout
      page={page}
      locale={locale}
      image={wiesbadenImage}
      teamPage={teamPage}
      employees={employees}
      phoneLabel={phoneLabel}
      mobileLabel={mobileLabel}
    />
  )
}

export default ContactPage
