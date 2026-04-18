import { useCallback, useRef, useState } from 'react'

interface UseImageLoadResult {
  loaded: boolean
  error: boolean
  ref: (node: HTMLImageElement | null) => void
  onLoad: () => void
  onError: () => void
}

const useImageLoad = (): UseImageLoadResult => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const loadedRef = useRef(false)

  const ref = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && !loadedRef.current) {
      loadedRef.current = true
      setLoaded(true)
    }
  }, [])

  const onLoad = useCallback(() => {
    loadedRef.current = true
    setLoaded(true)
  }, [])

  const onError = useCallback(() => setError(true), [])

  return { loaded, error, ref, onLoad, onError }
}

export { useImageLoad }
