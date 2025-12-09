/**
 * Platform Detection Hook
 *
 * Provides client-side platform and device detection for adaptive UI behavior.
 * Handles SSR by only detecting on the client side.
 *
 * @example
 * ```tsx
 * const { isMac, isWindows, isMobile, isTouch } = usePlatform()
 *
 * // Show appropriate keyboard shortcut
 * const shortcut = isMobile ? null : isMac ? '⌘K' : 'Ctrl+K'
 *
 * // Conditionally render touch-optimized UI
 * {isTouch && <TouchOptimizedButton />}
 * ```
 */

'use client'

import { useSyncExternalStore } from 'react'

export interface PlatformInfo {
  /** True if running on macOS or iOS */
  isMac: boolean
  /** True if running on Windows */
  isWindows: boolean
  /** True if running on Linux */
  isLinux: boolean
  /** True if running on iOS (iPhone, iPad, iPod) */
  isIOS: boolean
  /** True if running on Android */
  isAndroid: boolean
  /** True if device is mobile (iOS, Android, or other mobile platforms) */
  isMobile: boolean
  /** True if device has touch support */
  isTouch: boolean
  /** True if detection is complete (false during SSR) */
  isClient: boolean
}

/**
 * Detects platform information from the browser environment.
 * Pure function with no side effects.
 */
function detectPlatform(): PlatformInfo {
  // SSR: return default values
  if (typeof window === 'undefined') {
    return {
      isMac: false,
      isWindows: false,
      isLinux: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isTouch: false,
      isClient: false,
    }
  }

  const ua = navigator.userAgent

  // Operating system detection using userAgent (navigator.platform is deprecated)
  // Note: We use userAgent for OS detection as it's the most reliable cross-browser method
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua) && !isIOS
  const isWindows = /Win32|Win64|Windows|WinCE/i.test(ua)
  const isLinux = /Linux/i.test(ua) && !isAndroid

  // Mobile device detection (comprehensive)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)

  // Touch capability detection
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  return {
    isMac,
    isWindows,
    isLinux,
    isIOS,
    isAndroid,
    isMobile,
    isTouch,
    isClient: true,
  }
}

// Cache the platform detection result
let cachedPlatform: PlatformInfo | null = null

// Server-side snapshot (cached constant to avoid infinite loop warning)
const SERVER_SNAPSHOT: PlatformInfo = {
  isMac: false,
  isWindows: false,
  isLinux: false,
  isIOS: false,
  isAndroid: false,
  isMobile: false,
  isTouch: false,
  isClient: false,
}

/**
 * Clears the cached platform detection result.
 * Used primarily for testing purposes.
 * @internal
 */
export function clearPlatformCache(): void {
  cachedPlatform = null
}

function getPlatformSnapshot(): PlatformInfo {
  if (cachedPlatform === null) {
    cachedPlatform = detectPlatform()
  }
  return cachedPlatform
}

// Server-side snapshot (always returns the same cached object)
function getServerSnapshot(): PlatformInfo {
  return SERVER_SNAPSHOT
}

// No-op subscribe function (platform info doesn't change after initial detection)
function subscribe(): () => void {
  return () => {}
}

/**
 * Hook to detect the user's platform and device capabilities.
 * Returns platform information after client-side hydration.
 *
 * Uses useSyncExternalStore for proper SSR/client hydration handling.
 * Platform is detected once and cached for the lifetime of the app.
 *
 * During SSR, all platform flags are false and `isClient` is false.
 * After hydration, platform is detected and `isClient` becomes true.
 *
 * @returns Platform detection information
 */
export function usePlatform(): PlatformInfo {
  return useSyncExternalStore(subscribe, getPlatformSnapshot, getServerSnapshot)
}

/**
 * Utility function to get the appropriate keyboard shortcut key display.
 * Returns an empty string for mobile/touch devices.
 *
 * @example
 * ```tsx
 * const platform = usePlatform()
 * const shortcut = getShortcutDisplay(platform, 'k') // '⌘K' or 'Ctrl+K' or ''
 * ```
 *
 * @param platform - Platform info from usePlatform hook
 * @param key - The key to display (e.g., 'k', 'Enter', 'Esc')
 * @returns Formatted keyboard shortcut string or empty string for mobile
 */
export function getShortcutDisplay(platform: PlatformInfo, key: string): string {
  if (platform.isTouch || platform.isMobile) {
    return ''
  }
  return platform.isMac ? `⌘${key}` : `Ctrl+${key}`
}
