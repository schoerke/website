import ScrollAwareLogo from '@/components/Header/ScrollAwareLogo'
import { LOGO_FULL_FILENAME } from '@/services/media'
import { getImageByFilename } from '@/services/media.server'

const HeaderLogo = async () => {
  const full = await getImageByFilename(LOGO_FULL_FILENAME)

  return (
    <ScrollAwareLogo
      fullUrl={full?.url ?? ''}
      fullAlt={full?.alt ?? 'KSSchoerke Logo'}
    />
  )
}

export default HeaderLogo
