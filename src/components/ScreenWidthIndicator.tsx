'use client'

import { useEffect, useState } from 'react'

const ScreenWidthIndicator: React.FC = () => {
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (width === null) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 13,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
      aria-label="Screen width indicator"
    >
      {width}px
    </div>
  )
}

export default ScreenWidthIndicator
