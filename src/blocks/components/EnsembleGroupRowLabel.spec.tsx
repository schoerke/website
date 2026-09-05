// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import EnsembleGroupRowLabel from './EnsembleGroupRowLabel'

const payloadHooks = vi.hoisted(() => ({ useRowLabel: vi.fn() }))

vi.mock('@payloadcms/ui', () => ({ useRowLabel: payloadHooks.useRowLabel }))

describe('EnsembleGroupRowLabel', () => {
  it('renders the ensemble name', () => {
    payloadHooks.useRowLabel.mockReturnValue({ data: { groupName: 'Minguet Quartett' } })

    render(<EnsembleGroupRowLabel />)

    expect(screen.getByText('Minguet Quartett')).toBeInTheDocument()
  })

  it('uses a numbered fallback for an empty row', () => {
    payloadHooks.useRowLabel.mockReturnValue({ data: {}, rowNumber: 0 })

    render(<EnsembleGroupRowLabel />)

    expect(screen.getByText('Ensemble Group 01')).toBeInTheDocument()
  })
})
