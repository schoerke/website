import ScrollAwareLogo from '@/components/Header/ScrollAwareLogo'
import { LOGO_FULL_FILENAME, LOGO_ICON_FILENAME } from '@/services/media'
import { getImageByFilename } from '@/services/media.server'

const HeaderLogo = async () => {
  const [icon, full] = await Promise.all([
    getImageByFilename(LOGO_ICON_FILENAME),
    getImageByFilename(LOGO_FULL_FILENAME),
  ])

  return (
    <ScrollAwareLogo
      iconUrl={icon?.url ?? ''}
      iconAlt={icon?.alt ?? 'KSSchoerke Logo'}
      fullUrl={full?.url ?? ''}
      fullAlt={full?.alt ?? 'KSSchoerke Logo'}
    />
  )
}

export default HeaderLogo
