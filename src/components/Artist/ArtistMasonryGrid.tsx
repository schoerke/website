'use client'

import { Link } from '@/i18n/navigation'
import type { Artist, Image as PayloadImage } from '@/payload-types'
import ImageSkeleton from '@/components/ui/ImageSkeleton'
import { ARTIST_FEATURED_IMAGE_QUALITY, ARTIST_FEATURED_IMAGE_SIZES } from '@/constants/artistImage'
import { useDisableHoverOnScroll } from '@/hooks/useDisableHoverOnScroll'
import { useImageLoad } from '@/hooks/useImageLoad'
import { shuffleArray } from '@/utils/array'
import { getValidImageUrl, isImageObject } from '@/utils/image'
import { UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { startTransition, useEffect, useState } from 'react'

interface ArtistMasonryGridProps {
  artists: Artist[]
}

interface MasonryGridItemProps {
  artist: Artist
  translatedInstruments: string
  hoverDisabled: boolean
}

const MasonryGridItem: React.FC<MasonryGridItemProps> = ({ artist, translatedInstruments, hoverDisabled }) => {
  const { loaded, error, ref, onLoad, onError } = useImageLoad()
  const image = isImageObject(artist.image) ? (artist.image as PayloadImage) : null
  const imageUrl = getValidImageUrl(artist.image)
  const hasRealImage = imageUrl !== null
  const focalX = image?.focalX ?? 50
  const focalY = image?.focalY ?? 50
  const aspectRatio = image?.width && image?.height ? `${image.width} / ${image.height}` : '3 / 4'
  // Set once the user shows intent to visit this artist (hover/touch — deliberately not `focus`:
  // a keyboard user tabbing quickly through many cards would otherwise trigger a full hero-image
  // fetch for every card tabbed past, not just the one they intend to visit), so we start
  // preloading the exact image variant their detail page will request — matching the same
  // src/sizes/quality as the featured image there produces a byte-identical cache entry, making
  // the transition feel instant. Not preloaded upfront for every card to avoid over-fetching
  // full hero-size images for artists the user may never click.
  const [intentToVisit, setIntentToVisit] = useState(false)
  const markIntentToVisit = () => setIntentToVisit(true)

  const showPlaceholder = !hasRealImage || error

  // While scrolling, drop the hover overlay but keep its transition so exiting
  // hover fades out smoothly instead of snapping.
  const bgClasses = hoverDisabled
    ? 'absolute inset-0 flex flex-col justify-end bg-black/0 p-4 transition-all duration-300'
    : 'absolute inset-0 flex flex-col justify-end bg-black/0 p-4 transition-all duration-300 group-hover:bg-black/60'
  const overlayClasses = hoverDisabled
    ? 'translate-y-2 opacity-0 transition-all duration-300'
    : 'translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100'
  const imageClasses = 'block h-auto w-full object-cover'

  const content = (
    <div className="group relative w-full overflow-hidden">
      {showPlaceholder ? (
        <div
          data-testid="artist-masonry-image-placeholder"
          aria-hidden="true"
          className="flex w-full items-center justify-center bg-gray-100"
          style={{ aspectRatio: '3 / 4' }}
        >
          <UserRound className="h-16 w-16 text-gray-300" />
        </div>
      ) : (
        <>
          {/* Skeleton shimmer — out of flow so only the image box sizes the item */}
          {!loaded && (
            <ImageSkeleton
              width={image?.width}
              height={image?.height}
              fallbackRatio="3 / 4"
              className="absolute inset-0"
            />
          )}
          <Image
            src={imageUrl}
            alt={artist.name}
            width={600}
            height={800}
            className={`${imageClasses} ${loaded ? 'opacity-100' : 'opacity-0 transition-opacity'}`}
            style={{ aspectRatio, objectPosition: `${focalX}% ${focalY}%` }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            ref={ref}
            onLoad={onLoad}
            onError={onError}
          />
        </>
      )}
      {/* Hover overlay */}
      <div className={bgClasses}>
        <div className={overlayClasses}>
          <p className="font-playfair text-3xl font-bold text-white drop-shadow">{artist.name}</p>
          {translatedInstruments && (
            <p className="text-primary-yellow mt-0.5 text-sm drop-shadow">{translatedInstruments}</p>
          )}
        </div>
      </div>
    </div>
  )

  if (!artist.slug) return <div className="mb-1 break-inside-avoid">{content}</div>

  // No `hash: 'biography'` here on purpose: ArtistTabs already defaults to the biography tab
  // (or the artist's first available tab) when the URL has no matching hash, so the hash added
  // nothing functionally — but a hash with no matching `id` on the target page makes Next.js
  // treat the scroll intent as "already handled" and skip its normal scroll-to-top behavior,
  // leaving the user at their old scroll offset from the homepage instead of landing at the top.
  return (
    <Link
      href={{ pathname: '/artists/[slug]', params: { slug: artist.slug } }}
      className="mb-1 block break-inside-avoid"
      aria-label={translatedInstruments ? `${artist.name}, ${translatedInstruments}` : artist.name}
      onMouseEnter={markIntentToVisit}
      onTouchStart={markIntentToVisit}
    >
      {content}
      {intentToVisit && imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          aria-hidden="true"
          width={1}
          height={1}
          sizes={ARTIST_FEATURED_IMAGE_SIZES}
          quality={ARTIST_FEATURED_IMAGE_QUALITY}
          priority
          className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        />
      )}
    </Link>
  )
}

const ArtistMasonryGrid: React.FC<ArtistMasonryGridProps> = ({ artists }) => {
  const t = useTranslations('custom.instruments')
  const hoverDisabled = useDisableHoverOnScroll()
  const [displayed, setDisplayed] = useState(artists)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    startTransition(() => {
      setDisplayed(shuffleArray(artists))
      setReady(true)
    })
  }, [artists])

  return (
    <div
      className="columns-1 gap-1 sm:columns-2 lg:columns-3"
      style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.15s ease-in' }}
    >
      {displayed.map((artist) => {
        const translatedInstruments =
          artist.instrument?.map((inst) => t(inst as Parameters<typeof t>[0])).join(', ') ?? ''

        return (
          <MasonryGridItem
            key={String(artist.id)}
            artist={artist}
            translatedInstruments={translatedInstruments}
            hoverDisabled={hoverDisabled}
          />
        )
      })}
    </div>
  )
}

export default ArtistMasonryGrid
