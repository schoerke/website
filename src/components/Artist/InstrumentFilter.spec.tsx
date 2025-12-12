// @vitest-environment happy-dom
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InstrumentFilter from './InstrumentFilter'

const testMessages = {
  custom: {
    instruments: {
      conductor: 'Conductor',
      piano: 'Piano',
      'piano-forte': 'Fortepiano',
      violin: 'Violin',
      viola: 'Viola',
      cello: 'Cello',
      bass: 'Double Bass',
      horn: 'Horn',
      recorder: 'Recorder',
      'chamber-music': 'Chamber Music',
      harpsichord: 'Harpsichord',
    },
  },
}

const renderWithIntl = (component: React.ReactElement) => {
  return render(<NextIntlTestProvider messages={testMessages}>{component}</NextIntlTestProvider>)
}

describe('InstrumentFilter', () => {
  describe('Rendering', () => {
    it('should render all instruments', () => {
      const instruments = ['piano', 'violin', 'cello']
      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={vi.fn()} />)

      expect(screen.getByText('Piano')).toBeInTheDocument()
      expect(screen.getByText('Violin')).toBeInTheDocument()
      expect(screen.getByText('Cello')).toBeInTheDocument()
    })

    it('should render toggle group with accessibility label', () => {
      renderWithIntl(<InstrumentFilter instruments={['piano']} selected={[]} onChange={vi.fn()} />)

      expect(screen.getByRole('group', { name: 'Filter artists by instrument' })).toBeInTheDocument()
    })

    it('should render with multiple type', () => {
      renderWithIntl(<InstrumentFilter instruments={['piano', 'violin']} selected={[]} onChange={vi.fn()} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })
  })

  describe('Selection state', () => {
    it('should mark selected instruments as active', () => {
      const instruments = ['piano', 'violin', 'cello']
      renderWithIntl(<InstrumentFilter instruments={instruments} selected={['piano', 'violin']} onChange={vi.fn()} />)

      const pianoButton = screen.getByRole('button', { name: 'Piano' })
      const violinButton = screen.getByRole('button', { name: 'Violin' })
      const celloButton = screen.getByRole('button', { name: 'Cello' })

      expect(pianoButton).toHaveAttribute('data-state', 'on')
      expect(violinButton).toHaveAttribute('data-state', 'on')
      expect(celloButton).toHaveAttribute('data-state', 'off')
    })

    it('should show no selection when selected is empty', () => {
      const instruments = ['piano', 'violin']
      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={vi.fn()} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('data-state', 'off')
      })
    })
  })

  describe('User interaction', () => {
    it('should call onChange when instrument is selected', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const instruments = ['piano', 'violin']

      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={onChange} />)

      const pianoButton = screen.getByRole('button', { name: 'Piano' })
      await user.click(pianoButton)

      expect(onChange).toHaveBeenCalledWith(['piano'])
    })

    it('should support multiple selections', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const instruments = ['piano', 'violin', 'cello']

      renderWithIntl(<InstrumentFilter instruments={instruments} selected={['piano']} onChange={onChange} />)

      // Click violin (should add to selection)
      const violinButton = screen.getByRole('button', { name: 'Violin' })
      await user.click(violinButton)

      expect(onChange).toHaveBeenCalledWith(['piano', 'violin'])
    })

    it('should deselect instrument when clicked again', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const instruments = ['piano', 'violin']

      renderWithIntl(<InstrumentFilter instruments={instruments} selected={['piano']} onChange={onChange} />)

      // Click piano again (should remove from selection)
      const pianoButton = screen.getByRole('button', { name: 'Piano' })
      await user.click(pianoButton)

      expect(onChange).toHaveBeenCalledWith([])
    })
  })

  describe('Instrument sorting', () => {
    it('should sort instruments by priority: conductor first', () => {
      const instruments = ['violin', 'conductor', 'piano']
      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={vi.fn()} />)

      const buttons = screen.getAllByRole('button')
      const buttonTexts = buttons.map((btn) => btn.textContent)

      expect(buttonTexts[0]).toBe('Conductor')
      expect(buttonTexts[1]).toBe('Piano')
      expect(buttonTexts[2]).toBe('Violin')
    })

    it('should sort with correct priority: conductor, piano, violin, cello, viola, bass', () => {
      const instruments = ['bass', 'viola', 'cello', 'violin', 'piano', 'conductor']
      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={vi.fn()} />)

      const buttons = screen.getAllByRole('button')
      const buttonTexts = buttons.map((btn) => btn.textContent)

      expect(buttonTexts).toEqual(['Conductor', 'Piano', 'Violin', 'Cello', 'Viola', 'Double Bass'])
    })

    it('should sort piano-forte with same priority as piano', () => {
      const instruments = ['violin', 'piano-forte', 'piano', 'conductor']
      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={vi.fn()} />)

      const buttons = screen.getAllByRole('button')
      const buttonTexts = buttons.map((btn) => btn.textContent)

      // Conductor first, then piano and piano-forte (alphabetically), then violin
      expect(buttonTexts[0]).toBe('Conductor')
      expect(buttonTexts[1]).toBe('Piano')
      expect(buttonTexts[2]).toBe('Fortepiano')
      expect(buttonTexts[3]).toBe('Violin')
    })

    it('should sort unknown instruments alphabetically at the end', () => {
      const instruments = ['violin', 'horn', 'recorder', 'chamber-music', 'conductor']
      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={vi.fn()} />)

      const buttons = screen.getAllByRole('button')
      const buttonTexts = buttons.map((btn) => btn.textContent)

      // Conductor and violin have priority, others sorted alphabetically
      expect(buttonTexts[0]).toBe('Conductor')
      expect(buttonTexts[1]).toBe('Violin')
      // chamber-music, horn, recorder (alphabetically)
      expect(buttonTexts[2]).toBe('Chamber Music')
      expect(buttonTexts[3]).toBe('Horn')
      expect(buttonTexts[4]).toBe('Recorder')
    })
  })

  describe('Translation', () => {
    it('should translate all instrument names', () => {
      const instruments = ['piano', 'violin']
      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={vi.fn()} />)

      expect(screen.getByText('Piano')).toBeInTheDocument()
      expect(screen.getByText('Violin')).toBeInTheDocument()
      expect(screen.queryByText('piano')).not.toBeInTheDocument()
      expect(screen.queryByText('violin')).not.toBeInTheDocument()
    })

    it('should use translations for aria-label', () => {
      const instruments = ['piano']
      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={vi.fn()} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Piano')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty instruments array', () => {
      renderWithIntl(<InstrumentFilter instruments={[]} selected={[]} onChange={vi.fn()} />)

      const group = screen.getByRole('group')
      expect(group.querySelectorAll('button')).toHaveLength(0)
    })

    it('should handle single instrument', () => {
      renderWithIntl(<InstrumentFilter instruments={['piano']} selected={[]} onChange={vi.fn()} />)

      expect(screen.getByText('Piano')).toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(1)
    })

    it('should handle all instruments', () => {
      const allInstruments = [
        'conductor',
        'piano',
        'piano-forte',
        'violin',
        'viola',
        'cello',
        'bass',
        'horn',
        'recorder',
        'chamber-music',
        'harpsichord',
      ]
      renderWithIntl(<InstrumentFilter instruments={allInstruments} selected={[]} onChange={vi.fn()} />)

      expect(screen.getAllByRole('button')).toHaveLength(11)
    })

    it('should not mutate original instruments array', () => {
      const instruments = ['violin', 'conductor', 'piano']
      const originalOrder = [...instruments]

      renderWithIntl(<InstrumentFilter instruments={instruments} selected={[]} onChange={vi.fn()} />)

      expect(instruments).toEqual(originalOrder)
    })
  })
})
