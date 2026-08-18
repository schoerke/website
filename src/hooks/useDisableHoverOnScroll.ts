import { useEffect, useRef, useState } from 'react'

const DEFAULT_DEBOUNCE_MS = 100

/**
 * Returns true while the user is scrolling so hover-triggered effects can be
 * suppressed, avoiding jarring flicker under a moving cursor. Tracks
 * wheel/touchmove/scroll events to disable hover immediately, then re-enables
 * once scroll has been idle for the debounce window. A single pending timer is
 * kept; every new scroll event reschedules it.
 *
 * @param debounceMs - idle window before hover is re-enabled (default: 100)
 * @returns boolean indicating whether hover effects should be disabled
 *
 * @example
 * const hoverDisabled = useDisableHoverOnScroll()
 * ...
 * const overlayClass = hoverDisabled
 *   ? 'translate-y-2 opacity-0 transition-all duration-300'
 *   : 'translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100'
 */
const useDisableHoverOnScroll = (debounceMs: number = DEFAULT_DEBOUNCE_MS): boolean => {
  const [disabled, setDisabled] = useState(false)
  const lastScrollAtRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const disableDuringScroll = () => {
      lastScrollAtRef.current = Date.now()
      setDisabled(true)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        if (Date.now() - lastScrollAtRef.current >= debounceMs) {
          setDisabled(false)
        }
      }, debounceMs)
    }

    window.addEventListener('wheel', disableDuringScroll, { passive: true })
    window.addEventListener('touchmove', disableDuringScroll, { passive: true })
    window.addEventListener('scroll', disableDuringScroll, { passive: true, capture: true })

    return () => {
      window.removeEventListener('wheel', disableDuringScroll)
      window.removeEventListener('touchmove', disableDuringScroll)
      window.removeEventListener('scroll', disableDuringScroll, { capture: true })
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [debounceMs])

  return disabled
}

export { useDisableHoverOnScroll }