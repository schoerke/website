import type { Document } from '@/payload-types'
import { FileArchive, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React from 'react'

interface ArtistLinksDownloadsProps {
  downloads?: {
    biographyPDF?: Document | number | null
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

  const biographyURL = getDocumentURL(downloads.biographyPDF)
  const galleryURL = getDocumentURL(downloads.galleryZIP)

  // Return null if no download URLs exist
  if (!biographyURL && !galleryURL) {
    return null
  }

  return (
    <div>
      <h3 className="text-primary-black mb-2 text-sm font-semibold uppercase tracking-wider">{t('heading')}</h3>
      <ul className="space-y-2">
        {biographyURL && (
          <li>
            <a
              href={biographyURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-black hover:text-primary-black/70 focus-visible:outline-primary-yellow group inline-flex items-center gap-2 transition duration-150 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <FileText className="h-4 w-4" aria-hidden={true} />
              <span>{t('biography')}</span>
            </a>
          </li>
        )}
        {galleryURL && (
          <li>
            <a
              href={galleryURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-black hover:text-primary-black/70 focus-visible:outline-primary-yellow group inline-flex items-center gap-2 transition duration-150 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <FileArchive className="h-4 w-4" aria-hidden={true} />
              <span>{t('gallery')}</span>
            </a>
          </li>
        )}
      </ul>
    </div>
  )
}

export default ArtistLinksDownloads
