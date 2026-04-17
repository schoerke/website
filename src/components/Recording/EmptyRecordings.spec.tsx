// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import EmptyRecordings from '@/components/Recording/EmptyRecordings'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'

const messages = {
  custom: {
    pages: {
      artist: {
        empty: {
          discography: 'No discography available.',
        },
      },
    },
  },
}

describe('EmptyRecordings', () => {
  it('renders the discography empty message', () => {
    render(
      <NextIntlTestProvider messages={messages}>
        <EmptyRecordings />
      </NextIntlTestProvider>
    )

    expect(screen.getByText('No discography available.')).toBeInTheDocument()
  })

  it('renders a centered text container', () => {
    const { container } = render(
      <NextIntlTestProvider messages={messages}>
        <EmptyRecordings />
      </NextIntlTestProvider>
    )

    const div = container.firstChild as HTMLElement
    expect(div).toHaveClass('text-center')
  })
})
