import { Link } from '@/i18n/navigation'
import { LOGO_ICON_PATH, LOGO_PATH } from '@/services/media'
import Image from 'next/image'

const FooterLogo: React.FC = () => {
  return (
    <Link href="/" aria-label="Home">
      {/* Mobile: full text logo */}
      <Image
        src={LOGO_PATH}
        alt="KSSchoerke Logo"
        width={400}
        height={120}
        priority
        className="sm:hidden"
        style={{ width: 'auto', height: '100px' }}
      />
      {/* sm+: icon only */}
      <Image
        src={LOGO_ICON_PATH}
        alt="KSSchoerke Logo"
        width={120}
        height={120}
        priority
        className="hidden sm:block"
        style={{ width: 'auto', height: '100px' }}
      />
    </Link>
  )
}

export default FooterLogo
