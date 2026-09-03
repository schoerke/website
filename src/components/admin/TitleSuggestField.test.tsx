// @vitest-environment happy-dom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useDocumentInfo, useField, useLocale } from '@payloadcms/ui'
import type React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({
  TextField: ({ path }: { path: string }) => <input aria-label={path} />,
  useDocumentInfo: vi.fn(),
  useField: vi.fn(),
  useFormProcessing: vi.fn(() => false),
  useFormSubmitted: vi.fn(() => false),
  useLocale: vi.fn(),
}))

import TitleSuggestField from './TitleSuggestField'

const fieldProps = {
  field: { name: 'title', type: 'text' },
  path: 'title',
} as React.ComponentProps<typeof TitleSuggestField>

describe('TitleSuggestField', () => {
  it('hides prior locale suggestions while loading an uncached locale', async () => {
    vi.mocked(useDocumentInfo).mockReturnValue({ id: undefined } as ReturnType<typeof useDocumentInfo>)
    vi.mocked(useField).mockReturnValue({ value: 'Shared title' } as ReturnType<typeof useField>)
    vi.mocked(useLocale).mockReturnValue({ code: 'en' } as ReturnType<typeof useLocale>)

    let resolveEnglishTitles: ((value: Response) => void) | undefined
    let resolveGermanTitles: ((value: Response) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (url: string) =>
          new Promise<Response>((resolve) => {
            if (url.includes('locale=en')) resolveEnglishTitles = resolve
            else resolveGermanTitles = resolve
          })
      )
    )

    const { rerender } = render(<TitleSuggestField {...fieldProps} />)
    await act(async () => {
      resolveEnglishTitles?.(new Response(JSON.stringify({ docs: [{ id: 1, title: 'Shared title' }] })))
    })

    fireEvent.focus(screen.getByLabelText('title'))
    await waitFor(() => expect(screen.getByRole('list')).toBeInTheDocument())

    vi.mocked(useLocale).mockReturnValue({ code: 'de' } as ReturnType<typeof useLocale>)
    rerender(<TitleSuggestField {...fieldProps} />)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()

    await act(async () => {
      resolveGermanTitles?.(new Response(JSON.stringify({ docs: [] })))
    })
  })
})
