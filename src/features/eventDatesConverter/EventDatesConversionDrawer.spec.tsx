// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventDatesConversionDrawer from './EventDatesConversionDrawer'

vi.mock('@payloadcms/ui', () => ({
  Button: ({
    buttonStyle: _buttonStyle,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    buttonStyle?: string
  }) => <button {...props}>{children}</button>,
  Drawer: ({ children, slug, title }: { children: React.ReactNode; slug: string; title?: string }) =>
    modal.state[slug]?.isOpen !== false ? <section aria-label={title}>{children}</section> : null,
  useModal: () => ({
    closeModal: modal.close,
    modalState: modal.state,
    openModal: modal.open,
  }),
  TextInput: ({
    Error,
    label,
    path,
    showError: _showError,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    Error?: React.ReactNode
    label: string
    path: string
    showError?: boolean
  }) => (
    <div>
      <label htmlFor={`field-${path}`}>{label}</label>
      <input {...props} id={`field-${path}`} type="text" />
      {Error}
    </div>
  ),
}))

const modal = {
  close: vi.fn(),
  open: vi.fn(),
  state: {} as Record<string, { isOpen: boolean }>,
}

beforeEach(() => {
  modal.close.mockClear()
  modal.open.mockClear()
  modal.state = {}
})

describe('EventDatesConversionDrawer', () => {
  it('uses admin field controls in responsive event cards', () => {
    render(
      <EventDatesConversionDrawer
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )

    expect(screen.getByTestId('event-card-1')).toHaveClass('event-dates-conversion-drawer__event-card')
    expect(screen.getByText('4. Juli 2026, Yamagata')).toHaveClass('event-dates-conversion-drawer__source')
    expect(screen.getByTestId('event-fields-1')).toHaveClass('event-dates-conversion-drawer__fields')
    expect(screen.getByTestId('event-grid-1')).toHaveClass('event-dates-conversion-drawer__grid')
    expect(screen.getByLabelText('Date 1')).toHaveAttribute('type', 'text')
    expect(screen.getByTestId('event-dates-conversion-footer')).toBeInTheDocument()
  })

  it('shows source text, parsed values, and parse errors', () => {
    render(
      <EventDatesConversionDrawer
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[
          { key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' },
          { key: 'two', parentKey: 'parent', siblingIndex: 1, text: 'Tomorrow, Berlin' },
        ]}
      />
    )

    expect(screen.getByText('4. Juli 2026, Yamagata')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-07-04T12:00:00.000Z')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Yamagata')).toBeInTheDocument()
    expect(screen.getByText('Date must use a supported complete format')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled()
  })

  it('prepopulates German dot-separated dates from post 262', () => {
    render(
      <EventDatesConversionDrawer
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[
          { key: 'one', parentKey: 'parent', siblingIndex: 0, text: '3.6.2026, Post 262 first event' },
          { key: 'two', parentKey: 'parent', siblingIndex: 1, text: '4.6.2026, Post 262 second event' },
        ]}
      />
    )

    expect(screen.getByDisplayValue('2026-06-03T12:00:00.000Z')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-06-04T12:00:00.000Z')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert' })).toBeEnabled()
  })

  it('trims valid edits and emits canonical events', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    modal.state = { 'event-dates-conversion': { isOpen: true } }
    const { rerender } = render(
      <EventDatesConversionDrawer
        onCancel={onCancel}
        onConfirm={onConfirm}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: 'invalid' }]}
      />
    )

    fireEvent.change(screen.getByLabelText('Date 1'), { target: { value: '2026-07-04T12:00:00.000Z' } })
    fireEvent.change(screen.getByLabelText('Location 1'), { target: { value: ' Yamagata ' } })
    fireEvent.change(screen.getByLabelText('URL 1'), { target: { value: ' https://example.com/tour ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }))

    expect(onConfirm).toHaveBeenCalledWith([
      { date: '2026-07-04T12:00:00.000Z', location: 'Yamagata', url: 'https://example.com/tour' },
    ])
    expect(modal.close).toHaveBeenCalledWith('event-dates-conversion')
    modal.state = { 'event-dates-conversion': { isOpen: false } }
    rerender(
      <EventDatesConversionDrawer
        onCancel={onCancel}
        onConfirm={onConfirm}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: 'invalid' }]}
      />
    )
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('blocks confirmation for invalid edited fields and calls cancel', () => {
    const onCancel = vi.fn()
    modal.state = { 'event-dates-conversion': { isOpen: true } }
    const { rerender } = render(
      <EventDatesConversionDrawer
        onCancel={onCancel}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )

    fireEvent.change(screen.getByLabelText('Location 1'), { target: { value: '   ' } })
    expect(screen.getByText('Location is required')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
    modal.state = { 'event-dates-conversion': { isOpen: true }, unrelated: { isOpen: true } }
    rerender(
      <EventDatesConversionDrawer
        onCancel={onCancel}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )
    modal.state = { 'event-dates-conversion': { isOpen: false } }
    rerender(
      <EventDatesConversionDrawer
        onCancel={onCancel}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls cancel when native drawer close runs', () => {
    const onCancel = vi.fn()
    modal.state = { 'event-dates-conversion': { isOpen: true } }
    const { rerender } = render(
      <EventDatesConversionDrawer
        onCancel={onCancel}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )

    modal.state = { 'event-dates-conversion': { isOpen: false } }
    rerender(
      <EventDatesConversionDrawer
        onCancel={onCancel}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('resets edited rows when the drawer closes and reopens', () => {
    modal.state = { 'event-dates-conversion': { isOpen: true } }
    const { rerender } = render(
      <EventDatesConversionDrawer
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )
    fireEvent.change(screen.getByLabelText('Location 1'), { target: { value: 'Edited' } })

    modal.state = { 'event-dates-conversion': { isOpen: false } }
    rerender(
      <EventDatesConversionDrawer
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )
    modal.state = { 'event-dates-conversion': { isOpen: true } }
    rerender(
      <EventDatesConversionDrawer
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )

    expect(screen.getByDisplayValue('Yamagata')).toBeInTheDocument()
  })

  it('shows errors only on invalid fields', () => {
    render(
      <EventDatesConversionDrawer
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )
    fireEvent.change(screen.getByLabelText('URL 1'), { target: { value: 'javascript:alert(1)' } })

    expect(screen.queryByText('Date must use canonical noon UTC format')).not.toBeInTheDocument()
    expect(screen.queryByText('Location is required')).not.toBeInTheDocument()
    const error = screen.getByText('URL must be a valid HTTP(S) URL')
    const input = screen.getByLabelText('URL 1')
    expect(error).toHaveAttribute('id', 'event-1-url-error')
    expect(error).toHaveAttribute('role', 'alert')
    expect(input).toHaveAttribute('aria-describedby', 'event-1-url-error')
  })

  it('localizes visible controls and validation errors for English', () => {
    render(
      <EventDatesConversionDrawer
        locale="en"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: 'invalid' }]}
      />
    )

    expect(screen.getByRole('region', { name: 'Convert Event Dates' })).toBeInTheDocument()
    expect(screen.getByText('Event 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Date 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Location 1')).toBeInTheDocument()
    expect(screen.getByLabelText('URL 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert' })).toBeInTheDocument()
  })

  it('rejects impossible canonical UTC dates before confirming', () => {
    const onConfirm = vi.fn()
    render(
      <EventDatesConversionDrawer
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        slug="event-dates-conversion"
        sources={[{ key: 'one', parentKey: 'parent', siblingIndex: 0, text: '4. Juli 2026, Yamagata' }]}
      />
    )

    fireEvent.change(screen.getByLabelText('Date 1'), { target: { value: '2026-02-29T12:00:00.000Z' } })

    expect(screen.getByText('Date must use canonical noon UTC format')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
