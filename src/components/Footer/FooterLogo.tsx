import { Link } from '@/i18n/navigation'
import { LOGO_PATH } from '@/services/media'
import Image from 'next/image'

const FooterLogo: React.FC = () => {
  return (
    <Link href="/" aria-label="Home">
      <Image src={LOGO_PATH} alt="Logo" width={400} height={120} priority style={{ width: 'auto', height: 'auto' }} />
    </Link>
  )
}

export default FooterLogo
