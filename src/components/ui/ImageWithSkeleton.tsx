'use client'

import Image from 'next/image'
import { useCallback } from 'react'
import ImageSkeleton from '@/components/ui/ImageSkeleton'
import { useImageLoad } from '@/hooks/useImageLoad'

interface ImageWithSkeletonProps {
  src: string
  alt: string
  aspectRatio?: string
  className?: string
  priority?: boolean
  sizes?: string
  objectPosition?: string
  quality?: number
  onError?: () => void
}

const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
  src,
  alt,
  aspectRatio = '4 / 3',
  className,
  priority = false,
  sizes,
  objectPosition,
  quality,
  onError: onErrorProp,
}) => {
  const { loaded, error, ref, onLoad, onError } = useImageLoad()

  const handleError = useCallback(() => {
    onError()
    onErrorProp?.()
  }, [onError, onErrorProp])

  return (
    <div className={`relative w-full overflow-hidden bg-gray-100 ${className ?? ''}`} style={{ aspectRatio }}>
      {!loaded && !error && <ImageSkeleton fallbackRatio={aspectRatio} className="absolute inset-0" />}
      {error ? (
        <div data-testid="image-with-skeleton-error" aria-hidden="true" className="absolute inset-0 bg-gray-200" />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          quality={quality}
          className={`object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={objectPosition ? { objectPosition } : undefined}
          ref={ref}
          onLoad={onLoad}
          onError={handleError}
          sizes={sizes}
        />
      )}
    </div>
  )
}

export default ImageWithSkeleton
