import { Link } from '@/i18n/navigation'
import { getLogoIcon } from '@/services/media'
import Image from 'next/image'

const FooterLogo: React.FC = async () => {
  const logo = await getLogoIcon()

  if (!logo || !logo.url) {
    return <span>Logo not found</span>
  }

  return (
    <Link href="/" aria-label="Home">
      <Image src={logo.url} alt={logo.alt || 'Logo'} width={160} height={40} priority />
    </Link>
  )
}

export default FooterLogo
