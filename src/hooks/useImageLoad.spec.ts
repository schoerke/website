/**
 * @vitest-environment happy-dom
 */

import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useImageLoad } from './useImageLoad'

describe('useImageLoad', () => {
  it('should start with loaded and error as false', () => {
    const { result } = renderHook(() => useImageLoad())
    expect(result.current.loaded).toBe(false)
    expect(result.current.error).toBe(false)
  })

  it('should set loaded to true when onLoad is called', () => {
    const { result } = renderHook(() => useImageLoad())
    act(() => {
      result.current.onLoad()
    })
    expect(result.current.loaded).toBe(true)
    expect(result.current.error).toBe(false)
  })

  it('should set error to true when onError is called', () => {
    const { result } = renderHook(() => useImageLoad())
    act(() => {
      result.current.onError()
    })
    expect(result.current.error).toBe(true)
    expect(result.current.loaded).toBe(false)
  })

  it('should set loaded to true via ref when image is already complete', () => {
    const { result } = renderHook(() => useImageLoad())
    const fakeNode = { complete: true } as HTMLImageElement
    act(() => {
      result.current.ref(fakeNode)
    })
    expect(result.current.loaded).toBe(true)
  })

  it('should not set loaded via ref when image is not yet complete', () => {
    const { result } = renderHook(() => useImageLoad())
    const fakeNode = { complete: false } as HTMLImageElement
    act(() => {
      result.current.ref(fakeNode)
    })
    expect(result.current.loaded).toBe(false)
  })

  it('should not error when ref is called with null', () => {
    const { result } = renderHook(() => useImageLoad())
    expect(() => {
      act(() => {
        result.current.ref(null)
      })
    }).not.toThrow()
  })

  it('ref callback identity should be stable across renders', () => {
    const { result, rerender } = renderHook(() => useImageLoad())
    const refBefore = result.current.ref
    act(() => {
      result.current.onLoad()
    })
    rerender()
    expect(result.current.ref).toBe(refBefore)
  })

  it('should stay loaded when ref is called after onLoad already fired', () => {
    const { result } = renderHook(() => useImageLoad())
    act(() => {
      result.current.onLoad()
    })
    const fakeNode = { complete: true } as HTMLImageElement
    act(() => {
      result.current.ref(fakeNode)
    })
    expect(result.current.loaded).toBe(true)
    expect(result.current.error).toBe(false)
  })
})
