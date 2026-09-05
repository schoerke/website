// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import PerformerRowLabel from './PerformerRowLabel'

const payloadHooks = vi.hoisted(() => ({ useRowLabel: vi.fn() }))

vi.mock('@payloadcms/ui', () => ({ useRowLabel: payloadHooks.useRowLabel }))

describe('PerformerRowLabel', () => {
  it('renders the performer name', () => {
    payloadHooks.useRowLabel.mockReturnValue({ data: { name: 'Tianwa Yang' } })

    render(<PerformerRowLabel />)

    expect(screen.getByText('Tianwa Yang')).toBeInTheDocument()
  })

  it('uses a numbered fallback for an empty row', () => {
    payloadHooks.useRowLabel.mockReturnValue({ data: {}, rowNumber: 0 })

    render(<PerformerRowLabel />)

    expect(screen.getByText('Performer 01')).toBeInTheDocument()
  })
})
