// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EventDates, { formatEventDate } from './EventDates'

const withUrl = {
  id: 'row-1',
  date: '2026-07-04T00:00:00.000Z',
  location: 'Yamagata',
  url: 'https://yamagataterrsa.or.jp/concerts/20260704/',
}

const withoutUrl = { id: 'row-2', date: '2026-07-05T00:00:00.000Z', location: 'Fukushima' }

describe('formatEventDate', () => {
  it('formats a German date', () => {
    expect(formatEventDate('2026-07-04T00:00:00.000Z', 'de')).toBe('4. Juli 2026')
  })

  it('formats an English date', () => {
    expect(formatEventDate('2026-07-04T00:00:00.000Z', 'en')).toBe('July 4, 2026')
  })

  it('returns empty string for null, undefined, or empty input', () => {
    expect(formatEventDate(null, 'de')).toBe('')
    expect(formatEventDate(undefined, 'de')).toBe('')
    expect(formatEventDate('', 'de')).toBe('')
  })

  it('returns empty string for an invalid date', () => {
    expect(formatEventDate('not-a-date', 'de')).toBe('')
  })

  it('does not shift the day for midnight-UTC values', () => {
    expect(formatEventDate('2026-07-04T00:00:00.000Z', 'en')).toBe('July 4, 2026')
  })

  it('renders the correct day for a noon-UTC stored value', () => {
    expect(formatEventDate('2026-07-04T12:00:00.000Z', 'de')).toBe('4. Juli 2026')
    expect(formatEventDate('2026-07-04T12:00:00.000Z', 'en')).toBe('July 4, 2026')
  })

  it('renders the correct day for a midnight-UTC API value', () => {
    expect(formatEventDate('2026-07-04T00:00:00.000Z', 'de')).toBe('4. Juli 2026')
  })
})

describe('EventDates', () => {
  it('renders nothing when events is empty', () => {
    const { container } = render(<EventDates events={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when events is undefined', () => {
    const { container } = render(<EventDates events={undefined as never} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a linked line in German by default', () => {
    render(<EventDates events={[withUrl]} />)
    const link = screen.getByRole('link', { name: '4. Juli 2026, Yamagata' })
    expect(link.getAttribute('href')).toBe('https://yamagataterrsa.or.jp/concerts/20260704/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders a linked line in English when locale is en', () => {
    render(<EventDates events={[withUrl]} locale="en" />)
    expect(screen.getByRole('link', { name: 'July 4, 2026, Yamagata' })).toBeInTheDocument()
  })

  it('renders plain text when url is absent', () => {
    render(<EventDates events={[withoutUrl]} />)
    expect(screen.getByText('5. Juli 2026, Fukushima')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders plain text for an unsafe url', () => {
    render(<EventDates events={[{ ...withoutUrl, url: 'javascript:alert(1)' }]} />)
    expect(screen.getByText('5. Juli 2026, Fukushima')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders a link for a whitespace-padded url', () => {
    render(<EventDates events={[{ ...withoutUrl, url: ' https://example.com ' }]} />)
    expect(screen.getByRole('link', { name: '5. Juli 2026, Fukushima' }).getAttribute('href')).toBe(
      'https://example.com'
    )
  })

  it('renders multiple events in order separated by line breaks', () => {
    const { container } = render(<EventDates events={[withUrl, withoutUrl]} />)
    expect(screen.getByRole('link', { name: '4. Juli 2026, Yamagata' })).toBeInTheDocument()
    expect(screen.getByText('5. Juli 2026, Fukushima')).toBeInTheDocument()
    expect(container.querySelector('br')).not.toBeNull()
    expect(container.textContent).toBe('4. Juli 2026, Yamagata5. Juli 2026, Fukushima')
  })

  it('does not render 1970 or a leading comma when date is null', () => {
    render(<EventDates events={[{ id: 'row-3', date: null as never, location: 'Tokio' }]} />)
    expect(screen.getByText('Tokio')).toBeInTheDocument()
    expect(screen.queryByText(/1970/)).toBeNull()
  })

  it('does not render a trailing comma when location is empty', () => {
    const { container } = render(
      <EventDates events={[{ id: 'row-4', date: '2026-07-04T00:00:00.000Z', location: '' }]} />
    )
    expect(container.textContent).toBe('4. Juli 2026')
  })

  it('renders a row without an id', () => {
    const { date, location, url } = withUrl
    const { container } = render(<EventDates events={[{ date, location, url }]} />)
    expect(screen.getByRole('link', { name: '4. Juli 2026, Yamagata' })).toBeInTheDocument()
    expect(container.querySelector('a')).not.toBeNull()
  })
})
