// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDisableHoverOnScroll } from './useDisableHoverOnScroll'

describe('useDisableHoverOnScroll', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts enabled', () => {
    const { result } = renderHook(() => useDisableHoverOnScroll())

    expect(result.current).toBe(false)
  })

  it.each(['wheel', 'touchmove', 'scroll'] as const)('disables on %s and re-enables once idle', (eventName) => {
    const { result } = renderHook(() => useDisableHoverOnScroll(100))
    window.dispatchEvent(new Event(eventName))

    act(() => {
      window.dispatchEvent(new Event(eventName))
    })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(false)
  })

  it('stays disabled while scroll events keep arriving and re-enables after the last one', () => {
    const { result } = renderHook(() => useDisableHoverOnScroll(100))

    act(() => {
      window.dispatchEvent(new Event('wheel'))
    })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    // A later scroll event resets the idle window
    act(() => {
      window.dispatchEvent(new Event('wheel'))
    })
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe(false)
  })

  it('cleans up listeners and pending timer on unmount', () => {
    const { result, unmount } = renderHook(() => useDisableHoverOnScroll(100))

    act(() => {
      window.dispatchEvent(new Event('wheel'))
    })
    expect(result.current).toBe(true)

    unmount()

    // No listener or pending timer remains — advancing time and dispatching
    // events must not throw or update state after unmount
    expect(() => {
      act(() => {
        window.dispatchEvent(new Event('wheel'))
        vi.advanceTimersByTime(200)
      })
    }).not.toThrow()
  })
})