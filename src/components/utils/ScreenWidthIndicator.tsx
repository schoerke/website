'use client'

import { useEffect, useState } from 'react'

function getBreakpoint(width: number): string {
  if (width < 640) return 'xs' // < sm
  if (width < 768) return 'sm' // 640-767
  if (width < 1024) return 'md' // 768-1023
  if (width < 1280) return 'lg' // 1024-1279
  if (width < 1536) return 'xl' // 1280-1535
  return '2xl' // >= 1536
}

const ScreenWidthIndicator: React.FC = () => {
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (width === null) return null

  const breakpoint = getBreakpoint(width)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 13,
        fontFamily: 'monospace',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
      aria-label="Screen width indicator"
    >
      <strong>{breakpoint}</strong> {width}px
    </div>
  )
}

export default ScreenWidthIndicator
