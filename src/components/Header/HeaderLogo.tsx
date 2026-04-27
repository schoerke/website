import { Link } from '@/i18n/navigation'
import { LOGO_FULL_FILENAME, LOGO_ICON_FILENAME } from '@/services/media'
import { getImageByFilename } from '@/services/media.server'
import Image from 'next/image'

/**
 * HeaderLogo fetches SVG logos from Payload using the Local API.
 * - Mobile (<sm): icon-only logo
 * - Desktop (≥sm): full text logo
 * Falls back to a text label if either image is unavailable.
 */

const HeaderLogo = async () => {
  const [icon, full] = await Promise.all([
    getImageByFilename(LOGO_ICON_FILENAME),
    getImageByFilename(LOGO_FULL_FILENAME),
  ])

  return (
    <Link href="/" aria-label="Home" className="flex items-center">
      {/* Mobile: icon only */}
      {icon?.url ? (
        <Image
          src={icon.url}
          alt={icon.alt || 'KSSchoerke Logo'}
          width={120}
          height={120}
          priority
          unoptimized
          className="transition-opacity hover:opacity-80 sm:hidden"
          style={{ width: 'auto', height: '40px' }}
        />
      ) : (
        <span className="text-lg font-semibold sm:hidden">KSSchoerke</span>
      )}
      {/* sm+: full text logo */}
      {full?.url ? (
        <Image
          src={full.url}
          alt={full.alt || 'KSSchoerke Logo'}
          width={400}
          height={120}
          priority
          unoptimized
          className="hidden transition-opacity hover:opacity-80 sm:block"
          style={{ width: 'auto', height: '80px' }}
        />
      ) : (
        <span className="hidden text-lg font-semibold sm:block">KSSchoerke</span>
      )}
    </Link>
  )
}

export default HeaderLogo
