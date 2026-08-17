import { getEmployees } from '@/services/employee'
import { getImageByFilename } from '@/services/media.server'
import { getPageBySlug } from '@/services/page'
import { getTranslations } from 'next-intl/server'

export async function getContactPageData(locale: 'de' | 'en') {
  const t = await getTranslations({ locale, namespace: 'custom.pages.team' })

  const [teamPage, employeesResult, wiesbadenImage, dogImage] = await Promise.all([
    getPageBySlug('team', locale),
    getEmployees(locale),
    getImageByFilename('wiesbaden.webp'),
    getImageByFilename('IMG_8115.JPG'),
  ])

  return {
    teamPage,
    employees: employeesResult.docs,
    wiesbadenImage,
    dogImage,
    dogName: t('dogName'),
    dogTitle: t('dogTitle'),
    phoneLabel: t('phone'),
    mobileLabel: t('mobile'),
  }
}
