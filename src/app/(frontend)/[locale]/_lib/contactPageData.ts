import { getEmployees } from '@/services/employee'
import { getImageByFilename } from '@/services/media.server'
import { getPageBySlug } from '@/services/page'
import { getTranslations } from 'next-intl/server'

export async function getContactPageData(slug: 'contact' | 'kontakt', locale: 'de' | 'en') {
  const t = await getTranslations({ locale, namespace: 'custom.pages.team' })

  const [page, teamPage, employeesResult, wiesbadenImage] = await Promise.all([
    getPageBySlug(slug, locale),
    getPageBySlug('team', locale),
    getEmployees(locale),
    getImageByFilename('wiesbaden.webp'),
  ])

  return {
    page,
    teamPage,
    employees: employeesResult.docs,
    wiesbadenImage,
    phoneLabel: t('phone'),
    mobileLabel: t('mobile'),
  }
}
