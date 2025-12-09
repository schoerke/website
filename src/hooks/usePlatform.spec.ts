/**
 * @vitest-environment happy-dom
 */

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPlatformCache, getShortcutDisplay, usePlatform } from './usePlatform'

describe('usePlatform', () => {
  beforeEach(() => {
    // Clear cache before each test so mocked navigator values are detected
    clearPlatformCache()
  })

  it('should detect macOS', async () => {
    const originalUserAgent = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      configurable: true,
    })

    const { result, rerender } = renderHook(() => usePlatform())

    // Wait for useEffect to run
    await vi.waitFor(() => {
      expect(result.current.isClient).toBe(true)
    })

    rerender()

    expect(result.current.isMac).toBe(true)
    expect(result.current.isWindows).toBe(false)
    expect(result.current.isIOS).toBe(false)
    expect(result.current.isMobile).toBe(false)

    // Restore
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    })
  })

  it('should detect Windows', async () => {
    const originalUserAgent = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    })

    const { result, rerender } = renderHook(() => usePlatform())

    await vi.waitFor(() => {
      expect(result.current.isClient).toBe(true)
    })

    rerender()

    expect(result.current.isWindows).toBe(true)
    expect(result.current.isMac).toBe(false)
    expect(result.current.isMobile).toBe(false)

    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    })
  })

  it('should detect iOS', async () => {
    const originalUserAgent = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    })

    const { result, rerender } = renderHook(() => usePlatform())

    await vi.waitFor(() => {
      expect(result.current.isClient).toBe(true)
    })

    rerender()

    expect(result.current.isIOS).toBe(true)
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isMac).toBe(false) // iOS should not be detected as Mac

    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    })
  })

  it('should detect Android', async () => {
    const originalUserAgent = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10)',
      configurable: true,
    })

    const { result, rerender } = renderHook(() => usePlatform())

    await vi.waitFor(() => {
      expect(result.current.isClient).toBe(true)
    })

    rerender()

    expect(result.current.isAndroid).toBe(true)
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isLinux).toBe(false) // Android should not be detected as Linux

    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    })
  })

  it('should detect touch capability', async () => {
    const originalOntouchstart = 'ontouchstart' in window
    Object.defineProperty(window, 'ontouchstart', {
      value: {},
      configurable: true,
    })

    const { result, rerender } = renderHook(() => usePlatform())

    await vi.waitFor(() => {
      expect(result.current.isClient).toBe(true)
    })

    rerender()

    expect(result.current.isTouch).toBe(true)

    // Cleanup
    if (originalOntouchstart) {
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        configurable: true,
      })
    } else {
      delete (window as unknown as Record<string, unknown>).ontouchstart
    }
  })
})

describe('getShortcutDisplay', () => {
  it('should return Command key for Mac', () => {
    const platform = {
      isMac: true,
      isWindows: false,
      isLinux: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isTouch: false,
      isClient: true,
    }

    expect(getShortcutDisplay(platform, 'K')).toBe('⌘K')
  })

  it('should return Ctrl key for Windows', () => {
    const platform = {
      isMac: false,
      isWindows: true,
      isLinux: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isTouch: false,
      isClient: true,
    }

    expect(getShortcutDisplay(platform, 'K')).toBe('Ctrl+K')
  })

  it('should return empty string for mobile devices', () => {
    const platform = {
      isMac: false,
      isWindows: false,
      isLinux: false,
      isIOS: true,
      isAndroid: false,
      isMobile: true,
      isTouch: true,
      isClient: true,
    }

    expect(getShortcutDisplay(platform, 'K')).toBe('')
  })

  it('should return empty string for touch devices', () => {
    const platform = {
      isMac: false,
      isWindows: true,
      isLinux: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isTouch: true, // Touch-capable Windows device
      isClient: true,
    }

    expect(getShortcutDisplay(platform, 'K')).toBe('')
  })
})
