// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import EventDateRowLabel from './EventDateRowLabel'

const payloadHooks = vi.hoisted(() => ({
  useLocale: vi.fn(),
  useRowLabel: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  useLocale: payloadHooks.useLocale,
  useRowLabel: payloadHooks.useRowLabel,
}))

describe('EventDateRowLabel', () => {
  it('renders the German frontend date and location format', () => {
    payloadHooks.useLocale.mockReturnValue({ code: 'de' })
    payloadHooks.useRowLabel.mockReturnValue({
      data: { date: '2026-07-04T12:00:00.000Z', location: 'Yamagata' },
      rowNumber: 0,
    })

    render(<EventDateRowLabel />)

    expect(screen.getByText('4. Juli 2026 - Yamagata')).toBeInTheDocument()
  })

  it('renders the English frontend date and location format', () => {
    payloadHooks.useLocale.mockReturnValue({ code: 'en' })
    payloadHooks.useRowLabel.mockReturnValue({
      data: { date: '2026-07-04T12:00:00.000Z', location: 'Yamagata' },
      rowNumber: 1,
    })

    render(<EventDateRowLabel />)

    expect(screen.getByText('July 4, 2026 - Yamagata')).toBeInTheDocument()
  })

  it('uses the default numbered label for an empty row', () => {
    payloadHooks.useLocale.mockReturnValue({ code: 'de' })
    payloadHooks.useRowLabel.mockReturnValue({ data: {}, rowNumber: 0 })

    render(<EventDateRowLabel />)

    expect(screen.getByText('Veranstaltung 01')).toBeInTheDocument()
  })
})
