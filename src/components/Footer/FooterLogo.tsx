import config from '@/payload.config'
import Image from 'next/image'
import { getPayload } from 'payload'

const LOGO_FILENAME = 'schoerke_logo.png'

const FooterLogo: React.FC = async () => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'media',
    where: { filename: { equals: LOGO_FILENAME } },
    limit: 1,
  })
  const logo = result.docs[0]

  if (!logo || !logo.url) {
    return <span>Logo not found</span>
  }

  return <Image src={logo.url} alt={logo.alt || 'Logo'} width={160} height={40} priority />
}

export default FooterLogo
