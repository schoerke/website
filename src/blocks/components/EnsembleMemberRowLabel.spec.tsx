// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import EnsembleMemberRowLabel from './EnsembleMemberRowLabel'

const payloadHooks = vi.hoisted(() => ({ useLocale: vi.fn(), useRowLabel: vi.fn() }))

vi.mock('@payloadcms/ui', () => ({ useLocale: payloadHooks.useLocale, useRowLabel: payloadHooks.useRowLabel }))

describe('EnsembleMemberRowLabel', () => {
  it('renders the frontend name and instrument format', () => {
    payloadHooks.useRowLabel.mockReturnValue({
      data: { instrument: 'Violine', name: 'Tianwa Yang' },
      rowNumber: 0,
    })

    render(<EnsembleMemberRowLabel />)

    expect(screen.getByText('Tianwa Yang Violine')).toBeInTheDocument()
  })

  it('uses the numbered member label for an empty row', () => {
    payloadHooks.useLocale.mockReturnValue({ code: 'de' })
    payloadHooks.useRowLabel.mockReturnValue({ data: {}, rowNumber: 0 })

    render(<EnsembleMemberRowLabel />)

    expect(screen.getByText('Mitglied 01')).toBeInTheDocument()
  })
})
