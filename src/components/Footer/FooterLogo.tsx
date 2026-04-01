import { Link } from '@/i18n/navigation'
import { LOGO_ICON_PATH } from '@/services/media'
import Image from 'next/image'

const FooterLogo: React.FC = () => {
  return (
    <Link href="/" aria-label="Home">
      <Image
        src={LOGO_ICON_PATH}
        alt="Logo"
        width={40}
        height={40}
        priority
        style={{ width: 'auto', height: '100px' }}
      />
    </Link>
  )
}

export default FooterLogo
