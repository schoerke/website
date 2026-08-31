'use client'

import type { Image as PayloadImage, Recording } from '@/payload-types'
import { SiApplemusic, SiSpotify } from '@icons-pack/react-simple-icons'
import { Disc as DiscIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import React, { useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PayloadRichText from '@/components/ui/PayloadRichText'
import { getValidImageUrl } from '@/utils/image'
import { hasVisibleTextContent } from '@/utils/lexical'

interface RecordingDetailsDialogProps {
  recording: Recording
}

const RecordingDetailsDialog: React.FC<RecordingDetailsDialogProps> = ({ recording }) => {
  const t = useTranslations('custom.pages.artist.discography')
  const tRoles = useTranslations('custom.recordingRoles')
  const [open, setOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const coverArt =
    typeof recording.coverArt === 'object' && recording.coverArt !== null ? (recording.coverArt as PayloadImage) : null
  const coverArtUrl = getValidImageUrl(recording.coverArt)

  const hasDescription = hasVisibleTextContent(recording.description ?? null)
  const roles = recording.roles ?? []
  const roleLabels = roles.map((role) => tRoles(role))

  const joinItems = (items: string[]): React.ReactNode[] =>
    items.map((item, i) => (
      <React.Fragment key={`${item}-${i}`}>
        {i > 0 && ' • '}
        <span>{item}</span>
      </React.Fragment>
    ))

  return (
    <>
      {hasDescription && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex items-center text-sm text-gray-500 transition duration-150 ease-in-out hover:text-gray-900 hover:underline hover:decoration-primary-yellow focus:outline-none focus:ring-2 focus:ring-primary-yellow focus:ring-offset-2"
        >
          {t('details')}
        </button>
      )}

      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && setOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-left text-2xl font-bold">{recording.title}</DialogTitle>
            <DialogDescription className="sr-only">{t('details')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 sm:grid-cols-[180px_1fr]">
            <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-md bg-gray-100 sm:mx-0 sm:w-full">
              {coverArtUrl && !imageFailed ? (
                <Image
                  src={coverArtUrl}
                  alt={coverArt?.alt || recording.title}
                  fill
                  sizes="(min-width: 640px) 180px, 160px"
                  className="object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div
                  data-testid="recording-details-cover-placeholder"
                  aria-hidden="true"
                  className="flex h-full w-full items-center justify-center"
                >
                  <DiscIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="space-y-6">
              {(recording.recordingLabel || recording.catalogNumber || recording.recordingYear) && (
                <div>
                  {recording.recordingLabel && (
                    <p className="text-lg text-gray-600">{recording.recordingLabel}</p>
                  )}
                  {recording.catalogNumber && (
                    <p className="mt-1 text-sm text-gray-600">{recording.catalogNumber}</p>
                  )}
                  {recording.recordingYear && (
                    <p className="mt-1 text-sm text-gray-600">{recording.recordingYear}</p>
                  )}
                </div>
              )}

              {roleLabels.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{t('roles')}</p>
                  <p className="mt-1 text-sm text-gray-600">{joinItems(roleLabels)}</p>
                </div>
              )}
            </div>
          </div>

          {hasDescription && recording.description && (
            <div className="prose max-w-prose divide-y divide-gray-200">
              <PayloadRichText content={recording.description} />
            </div>
          )}

          {(recording.spotifyURL || recording.appleMusicURL) && (
            <div className="flex flex-wrap items-center gap-6 border-t border-gray-200 pt-6">
              {recording.spotifyURL && (
                <a
                  href={recording.spotifyURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('listenOnSpotifyFor', { title: recording.title })}
                  className="inline-flex items-center gap-2 text-gray-600 transition duration-150 ease-in-out hover:text-gray-900"
                >
                  {t('listenOnSpotify')}
                  <SiSpotify width={20} height={20} aria-hidden="true" />
                  <span className="sr-only"> ({t('opensInNewTab')})</span>
                </a>
              )}
              {recording.appleMusicURL && (
                <a
                  href={recording.appleMusicURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('listenOnAppleMusicFor', { title: recording.title })}
                  className="inline-flex items-center gap-2 text-gray-600 transition duration-150 ease-in-out hover:text-gray-900"
                >
                  {t('listenOnAppleMusic')}
                  <SiApplemusic width={20} height={20} aria-hidden="true" />
                  <span className="sr-only"> ({t('opensInNewTab')})</span>
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default RecordingDetailsDialog
