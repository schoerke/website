import type { Document } from '@/payload-types'
import { FileArchive, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React from 'react'

interface ArtistLinksDownloadsProps {
  downloads?: {
    biographyPdf?: Document | number | null
    galleryZIP?: Document | number | null
  }
}

function getDocumentURL(doc: Document | number | null | undefined): string | null {
  if (!doc || typeof doc === 'number') {
    return null
  }
  return doc.url || null
}

const ArtistLinksDownloads: React.FC<ArtistLinksDownloadsProps> = ({ downloads }) => {
  const t = useTranslations('custom.pages.artist.artistLinks.downloads')

  if (!downloads) {
    return null
  }

  const biographyURL = getDocumentURL(downloads.biographyPdf)
  const galleryURL = getDocumentURL(downloads.galleryZIP)

  const downloadItems = [
    { id: 'biography', url: biographyURL, label: t('biography'), icon: FileText },
    { id: 'gallery', url: galleryURL, label: t('gallery'), icon: FileArchive },
  ].filter((item) => Boolean(item.url))

  // Return null if no download URLs exist
  if (downloadItems.length === 0) {
    return null
  }

  return (
    <ul className="mt-6 space-y-1 md:text-right">
      {downloadItems.map(({ id, url, label, icon: Icon }) => (
        <li key={id} className="md:flex md:justify-end">
          <a
            href={url!}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-visible:outline-primary-yellow inline-flex items-center gap-2.5 text-sm text-primary-black/80 transition duration-150 ease-in-out hover:text-primary-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden={true} />
            <span className="md:order-first">{label}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export default ArtistLinksDownloads
