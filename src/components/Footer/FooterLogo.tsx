import config from '@/payload.config'
import { getLogoIcon } from '@/services/media'
import Image from 'next/image'
import { getPayload } from 'payload'

const FooterLogo: React.FC = async () => {
  const payload = await getPayload({ config })
  const logo = await getLogoIcon(payload)

  if (!logo || !logo.url) {
    return <span>Logo not found</span>
  }

  return <Image src={logo.url} alt={logo.alt || 'Logo'} width={160} height={40} priority />
}

export default FooterLogo
