import { Link } from '@/i18n/navigation'
import { getLogoIcon } from '@/services/media'
import Image from 'next/image'

const FooterLogo: React.FC = () => {
  const logoPath = getLogoIcon()

  return (
    <Link href="/" aria-label="Home">
      <Image src={logoPath} alt="Logo" width={160} height={40} priority />
    </Link>
  )
}

export default FooterLogo
