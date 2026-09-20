import { useCallback, useRef, useState } from 'react'

interface UseImageLoadResult {
  loaded: boolean
  error: boolean
  /**
   * True when the image was already in the browser cache at mount time (detected via
   * `node.complete` in the ref callback, before any `load` event could fire). Consumers can use
   * this to skip a fade-in transition for already-cached images, so a warm-cache image (e.g. one
   * preloaded ahead of navigation) appears truly instantly instead of still animating in.
   */
  wasCached: boolean
  ref: (node: HTMLImageElement | null) => void
  onLoad: () => void
  onError: () => void
}

const useImageLoad = (): UseImageLoadResult => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [wasCached, setWasCached] = useState(false)
  const loadedRef = useRef(false)

  const ref = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0 && !loadedRef.current) {
      loadedRef.current = true
      setLoaded(true)
      setWasCached(true)
    }
  }, [])

  const onLoad = useCallback(() => {
    loadedRef.current = true
    setLoaded(true)
  }, [])

  const onError = useCallback(() => setError(true), [])

  return { loaded, error, wasCached, ref, onLoad, onError }
}

export { useImageLoad }
