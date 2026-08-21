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
  mobileContent?: ReactNode
  children: ReactNode
}

const EmployeeCardShell: React.FC<EmployeeCardShellProps> = ({
  name,
  title,
  image,
  priority = false,
  grayscale = false,
  mobileContent,
  children,
}) => {
  const hoverDisabled = useDisableHoverOnScroll()
  const imageUrl = getValidImageUrl(image)
  const showPlaceholder = !imageUrl
  const img = isImageObject(image) ? image : null
  const focalX = img?.focalX ?? 50
  const focalY = img?.focalY ?? 50

  // Desktop contact details use the original bottom drawer. It is separate
  // from the name/title scrim, so resting text never shifts when hidden.
  const drawerClasses = hoverDisabled
    ? 'hidden sm:block pointer-events-none absolute inset-x-0 bottom-0 bg-black/70 p-4 text-white transition-transform duration-300 translate-y-full'
    : 'hidden sm:block pointer-events-none absolute inset-x-0 bottom-0 bg-black/70 p-4 text-white transition-transform duration-300 translate-y-full sm:group-hover:translate-y-0 sm:group-hover:pointer-events-auto sm:group-focus-within:translate-y-0 sm:group-focus-within:pointer-events-auto'

  const scrimClasses = hoverDisabled
    ? 'pointer-events-none absolute inset-x-0 bottom-0 flex flex-row items-end justify-between gap-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-14 text-white transition-colors duration-300 sm:block sm:gap-0'
    : 'pointer-events-none absolute inset-x-0 bottom-0 flex flex-row items-end justify-between gap-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-14 text-white transition-colors duration-300 sm:block sm:gap-0 group-hover:from-black/90 group-hover:via-black/60'

  const cardClasses = hoverDisabled
    ? 'group relative block w-full overflow-hidden rounded bg-gray-100 shadow-md transition-transform'
    : 'group relative block w-full overflow-hidden rounded bg-gray-100 shadow-md transition-transform hover:scale-[1.02]'

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
        <div className={scrimClasses}>
          <div className="min-w-0">
            <p className="font-playfair text-2xl font-bold italic text-white drop-shadow">{name}</p>
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
        <div data-testid="employee-card-overlay-content" className={drawerClasses}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default EmployeeCardShell
