// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import RoleFilter from '@/components/Recording/RoleFilter'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'

const messages = {
  common: {
    all: 'All',
  },
  custom: {
    recordingRoles: {
      soloist: 'Soloist',
      conductor: 'Conductor',
    },
  },
}

function renderFilter(props: Partial<React.ComponentProps<typeof RoleFilter>> = {}) {
  return render(
    <NextIntlTestProvider messages={messages}>
      <RoleFilter roles={['soloist', 'conductor']} selected={null} onChange={vi.fn()} {...props} />
    </NextIntlTestProvider>
  )
}

describe('RoleFilter', () => {
  it('renders an "All" toggle plus one per role', () => {
    renderFilter()

    expect(screen.getByRole('radio', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Soloist' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Conductor' })).toBeInTheDocument()
  })

  it('styles role toggles as underline subtabs matching Repertoire and Media', () => {
    renderFilter()

    const allButton = screen.getByRole('radio', { name: 'All' })
    const soloistButton = screen.getByRole('radio', { name: 'Soloist' })
    const conductorButton = screen.getByRole('radio', { name: 'Conductor' })

    for (const button of [allButton, soloistButton, conductorButton]) {
      expect(button).toHaveClass('rounded-none')
      expect(button).toHaveClass('border-b-2')
      expect(button).toHaveClass('border-transparent')
      expect(button).toHaveClass('data-[state=on]:border-primary-yellow')
      expect(button).toHaveClass('data-[state=on]:bg-transparent')
    }
  })
})
