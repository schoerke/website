'use client'

import { useDisableHoverOnScroll } from '@/hooks/useDisableHoverOnScroll'
import type { Image as PayloadImage } from '@/payload-types'
import { getValidImageUrl, isImageObject } from '@/utils/image'
import { UserRound } from 'lucide-react'
import Image from 'next/image'
import { ReactNode } from 'react'

interface EmployeeCardShellProps {
  name: string
  title: string
  image?: PayloadImage | number | null
  priority?: boolean
  grayscale?: boolean
  // Renders the full-card hover overlay only when children carry content.
  hasHoverContent?: boolean
  mobileContent?: ReactNode
  children: ReactNode
}

const EmployeeCardShell: React.FC<EmployeeCardShellProps> = ({
  name,
  title,
  image,
  priority = false,
  grayscale = false,
  hasHoverContent = false,
  mobileContent,
  children,
}) => {
  const hoverDisabled = useDisableHoverOnScroll()
  const imageUrl = getValidImageUrl(image)
  const showPlaceholder = !imageUrl
  const img = isImageObject(image) ? image : null
  const focalX = img?.focalX ?? 50
  const focalY = img?.focalY ?? 50

  // Desktop hover: full-cover translucent overlay fades in over the photo and
  // carries the card's children (contact links, Woof!) at the top. The resting
  // scrim renders on top (later sibling) so the bottom name/title stays crisp.
  const overlayClasses = hoverDisabled
    ? 'hidden sm:block pointer-events-none absolute inset-0 bg-black/75 text-white opacity-0 transition-opacity duration-300'
    : 'hidden sm:block pointer-events-none absolute inset-0 bg-black/75 text-white opacity-0 transition-opacity duration-300 sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-focus-within:pointer-events-auto'

  // Bottom gradient scrim sits above the overlay for resting legibility. Its
  // gradient layer fades out on desktop hover so only the crisp name/title text
  // remains over the dimmed photo.
  const gradientClasses =
    hasHoverContent && !hoverDisabled
      ? 'pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 sm:group-hover:opacity-0 sm:group-focus-within:opacity-0'
      : 'pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent'

  const scrimClasses = 'pointer-events-none z-10 absolute inset-x-0 bottom-0 flex flex-row items-end justify-between gap-4 px-4 pb-3 text-white sm:block sm:gap-0'

  const cardClasses = 'group relative block w-full overflow-hidden rounded bg-gray-100 shadow-md'

  return (
    <div className={cardClasses}>
      <div className="relative aspect-square w-full overflow-hidden">
        {showPlaceholder ? (
          <div
            data-testid="team-member-image-placeholder"
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center"
          >
            <UserRound className="h-24 w-24 text-gray-300" />
          </div>
        ) : (
          <Image
            src={imageUrl}
            alt={name || 'Team Member'}
            fill
            priority={priority}
            className={`object-cover${grayscale ? ' grayscale' : ''}`}
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        )}
        {hasHoverContent && (
          <div data-testid="employee-card-overlay-content" className={overlayClasses}>
            <div className="flex flex-col gap-6 p-6">{children}</div>
          </div>
        )}
        <div data-testid="employee-card-gradient" aria-hidden="true" className={gradientClasses} />
        <div className={scrimClasses}>
          <div data-testid="employee-card-name" className="min-w-0">
            <p className="font-playfair text-2xl font-bold text-white drop-shadow">{name}</p>
            {title && <p className="text-primary-yellow mt-0.5 text-sm drop-shadow">{title}</p>}
          </div>
          {mobileContent && (
            <div
              data-testid="employee-card-mobile-buttons"
              className="pointer-events-auto flex flex-row items-end gap-2 sm:hidden"
            >
              {mobileContent}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmployeeCardShell
