interface ImageSkeletonProps {
  width?: number | null
  height?: number | null
  fallbackRatio?: string
  className?: string
}

const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ width, height, fallbackRatio = '3 / 2', className }) => {
  const aspectRatio = width && height ? `${width} / ${height}` : fallbackRatio
  return (
    <div className={`w-full animate-pulse bg-gray-200 ${className ?? ''}`} style={{ aspectRatio }} aria-hidden="true" />
  )
}

export default ImageSkeleton
