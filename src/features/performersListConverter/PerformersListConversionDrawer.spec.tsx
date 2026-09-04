// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PerformersListConversionDrawer from './PerformersListConversionDrawer'
import type { PerformersListSource } from './selection'

vi.mock('@payloadcms/ui', () => ({
  Button: ({
    buttonStyle: _buttonStyle,
    children,
    round: _round,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { buttonStyle?: string; round?: boolean }) => (
    <button {...props}>{children}</button>
  ),
  Drawer: ({ children, slug, title }: { children: React.ReactNode; slug: string; title?: string }) =>
    modal.state[slug]?.isOpen !== false ? <section aria-label={title}>{children}</section> : null,
  MoreIcon: () => <span>More</span>,
  Popup: ({
    button,
    render,
  }: {
    button: React.ReactNode
    render: (args: { close: () => void }) => React.ReactNode
  }) => (
    <div>
      {button}
      {render({ close: vi.fn() })}
    </div>
  ),
  PopupList: {
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    ButtonGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
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
  useModal: () => ({ closeModal: modal.close, modalState: modal.state }),
}))

const modal = { close: vi.fn(), state: {} as Record<string, { isOpen: boolean }> }
const drawerStyles = readFileSync('src/features/performersListConverter/PerformersListConversionDrawer.scss', 'utf8')

function source(sourceId: string, text: string, url?: string): PerformersListSource {
  return { key: sourceId, lineIndex: 0, parentKey: 'root', siblingIndex: 0, sourceId, text, url }
}

function renderDrawer(sources: PerformersListSource[], onConfirm = vi.fn(), onCancel = vi.fn()) {
  return {
    onCancel,
    onConfirm,
    ...render(
      <PerformersListConversionDrawer onCancel={onCancel} onConfirm={onConfirm} slug="performers" sources={sources} />
    ),
  }
}

beforeEach(() => {
  modal.close.mockClear()
  modal.state = {}
})

describe('PerformersListConversionDrawer', () => {
  it('shows editable nested group members', () => {
    renderDrawer([
      source('solo', 'Tianwa Yang | Violine'),
      source('group', 'Trio Catch'),
      source('member', 'Martin Adamek | Klarinette'),
    ])

    expect(screen.getByDisplayValue('Tianwa Yang')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Violine')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Trio Catch')).toBeInTheDocument()
    expect(screen.getAllByText('Name')).toHaveLength(2)
    expect(screen.getAllByText('Instrument')).toHaveLength(2)
    expect(screen.getByText('Group name')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Name: Martin Adamek | Klarinette, member 1 in row 2'), {
      target: { value: 'Martin Adamek Jr.' },
    })
    expect(screen.getByDisplayValue('Martin Adamek Jr.')).toBeInTheDocument()
  })

  it('keeps row ordinals accessible only', () => {
    renderDrawer([source('first', 'First | Violin'), source('second', 'Second | Cello')])

    expect(screen.queryByText(/^Performer \d+$/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Second | Cello up, row 2' })).toBeInTheDocument()
  })

  it('uses EventDates-style row cards and borderless structural member containers', () => {
    const { container } = renderDrawer([
      source('solo', 'Tianwa Yang | Violine'),
      source('group', 'Trio Catch'),
      source('member', 'Martin Adamek | Klarinette'),
    ])

    expect(container.querySelectorAll('.performers-list-conversion-drawer__row')).toHaveLength(2)
    expect(container.querySelectorAll('.performers-list-conversion-drawer__member')).toHaveLength(1)
    expect(container.querySelectorAll('.performers-list-conversion-drawer__fields')).toHaveLength(3)
    expect(container.querySelectorAll('.performers-list-conversion-drawer__grid')).toHaveLength(2)
    expect(container.querySelector('.performers-list-conversion-drawer__performer-card')).not.toBeInTheDocument()
    expect(container.querySelector('.performers-list-conversion-drawer__member-card')).not.toBeInTheDocument()
  })

  it('wraps editable fields and row controls in a shared fields-first layout container', () => {
    const { container } = renderDrawer([source('solo', 'Tianwa Yang | Violine')])

    const layout = container.querySelector('.performers-list-conversion-drawer__row-layout')
    expect(layout).toBeInTheDocument()
    expect(layout?.children[0]).toHaveClass('performers-list-conversion-drawer__fields')
    expect(layout?.children[1]).toHaveClass('performers-list-conversion-drawer__controls')
  })

  it('keeps fields before the inline action cluster', () => {
    const { container } = renderDrawer([
      source('solo', 'Tianwa Yang | Violine'),
      source('group', 'Trio Catch'),
      source('member', 'Martin Adamek | Klarinette'),
    ])

    for (const layout of container.querySelectorAll('.performers-list-conversion-drawer__row-layout')) {
      expect(layout.children[0]).toHaveClass('performers-list-conversion-drawer__fields')
      expect(layout.children[1]).toHaveClass('performers-list-conversion-drawer__controls')
    }
    expect(drawerStyles).toMatch(
      /\.performers-list-conversion-drawer__row-layout\s*\{[^}]*display:\s*flex !important;/s
    )
  })

  it('disables boundary moves and supports nest and unnest', () => {
    renderDrawer([
      source('group', 'Trio Catch'),
      source('solo', 'Tianwa Yang | Violine'),
      source('other', 'Other | Cello'),
    ])

    expect(screen.getByRole('button', { name: /Move Trio Catch up/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Move Other \| Cello down/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Remove Tianwa Yang \| Violine from group/ }))
    expect(screen.getByRole('button', { name: /Add Tianwa Yang \| Violine to previous group/ })).toBeInTheDocument()
  })

  it('requires deletion acknowledgement and focuses next name input after delete', () => {
    const { onConfirm } = renderDrawer([source('first', 'First | Violin'), source('second', 'Second | Cello')])

    fireEvent.click(screen.getByRole('button', { name: /Delete First \| Violin/ }))
    expect(screen.getByText('1 source row will be deleted.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name: Second | Cello, row 1')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Acknowledge deletion of 1 source row'))
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }))
    expect(onConfirm).toHaveBeenCalledWith([{ blockType: 'performer', instrument: 'Cello', name: 'Second' }])
  })

  it('requires link and deletion acknowledgements independently', () => {
    renderDrawer([
      source('linked-delete', 'First | Violin', ' javascript:alert(1) '),
      source('linked-keep', 'Second | Cello', ' https://example.test/a '),
    ])

    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Delete First \| Violin/ }))
    expect(screen.getByLabelText('Acknowledge loss of 2 discarded links')).toBeInTheDocument()
    expect(screen.getByText('1 source row will be deleted.')).toBeInTheDocument()
    const convert = screen.getByRole('button', { name: 'Convert' })
    fireEvent.click(screen.getByLabelText('Acknowledge loss of 2 discarded links'))
    expect(convert).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Acknowledge deletion of 1 source row'))
    expect(convert).toBeEnabled()
  })

  it('keeps parser failures visible and blocks conversion', () => {
    renderDrawer([source('invalid', '| Violine')])

    expect(screen.getByText('Performer name is required')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled()
  })

  it('associates duplicate group-name errors by source ID', () => {
    renderDrawer([
      source('invalid-group', 'Duplicate'),
      source('valid-group', 'Duplicate'),
      source('member', 'Member | Violin'),
    ])

    const groups = screen.getAllByRole('textbox', { name: /Group name: Duplicate/ })
    expect(groups[0]).toHaveAttribute('aria-describedby', 'performers-group-invalid-group-error')
    expect(groups[1]).not.toHaveAttribute('aria-describedby')
  })

  it('calls cancel once when native drawer close runs', () => {
    modal.state = { performers: { isOpen: true } }
    const onCancel = vi.fn()
    const { rerender } = renderDrawer([source('solo', 'Tianwa Yang | Violine')], vi.fn(), onCancel)

    modal.state = { performers: { isOpen: false } }
    rerender(<PerformersListConversionDrawer onCancel={onCancel} onConfirm={vi.fn()} slug="performers" sources={[]} />)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls cancel once for explicit cancellation', () => {
    const { onCancel } = renderDrawer([source('solo', 'Tianwa Yang | Violine')])
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('focuses next, previous, or group member name after deleting a member', () => {
    const sources = [
      source('group', 'Trio'),
      source('first', 'First | Violin'),
      source('second', 'Second | Cello'),
      source('third', 'Third | Flute'),
    ]
    const { unmount } = renderDrawer(sources)
    fireEvent.click(screen.getByRole('button', { name: /Delete First \| Violin/ }))
    expect(screen.getByLabelText('Name: Second | Cello, member 1 in row 1')).toHaveFocus()

    unmount()
    const second = renderDrawer(sources)
    fireEvent.click(screen.getByRole('button', { name: /Delete Third \| Flute/ }))
    expect(screen.getByLabelText('Name: Second | Cello, member 2 in row 1')).toHaveFocus()

    second.unmount()
    renderDrawer([source('group', 'Trio'), source('only', 'Only | Violin')])
    fireEvent.click(screen.getByRole('button', { name: /Delete Only \| Violin/ }))
    expect(screen.getByLabelText('Group name: Trio, row 1')).toHaveFocus()
  })

  it('blocks delete-all and does not confirm', () => {
    const { onConfirm } = renderDrawer([source('solo', 'Tianwa Yang | Violine')])
    fireEvent.click(screen.getByRole('button', { name: /Delete Tianwa Yang \| Violine/ }))
    fireEvent.click(screen.getByLabelText('Acknowledge deletion of 1 source row'))
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('retains link warning for a member nested from a linked performer', () => {
    renderDrawer([source('group', 'Trio'), source('linked', 'Tianwa Yang | Violine', ' https://example.test/a ')])
    expect(screen.getByText('https://example.test/a')).toBeInTheDocument()
    expect(screen.getByLabelText('Acknowledge loss of 1 discarded link')).toBeInTheDocument()
  })

  it('normalizes final output and omits blank instruments', () => {
    const { onConfirm } = renderDrawer([source('solo', 'Tianwa Yang | Violine')])
    fireEvent.change(screen.getByLabelText('Name: Tianwa Yang | Violine, row 1'), {
      target: { value: '\u0000 Tianwa Yang\u00a0' },
    })
    fireEvent.change(screen.getByLabelText('Instrument: Tianwa Yang | Violine, row 1'), {
      target: { value: '\u001F  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }))
    expect(onConfirm).toHaveBeenCalledWith([{ blockType: 'performer', name: 'Tianwa Yang' }])
  })

  it('gives duplicate source row controls distinct ordinal labels', () => {
    renderDrawer([source('first', 'Duplicate | Violin'), source('second', 'Duplicate | Violin')])

    const deleteControls = screen.getAllByRole('button', { name: /Delete Duplicate \| Violin/ })
    expect(deleteControls.map((control) => control.getAttribute('aria-label'))).toEqual([
      'Delete Duplicate | Violin, row 1',
      'Delete Duplicate | Violin, row 2',
    ])
  })

  it('keeps field labels concise and gives duplicate source row fields distinct accessible names', () => {
    renderDrawer([
      source('first', 'Duplicate | Violin'),
      source('second', 'Duplicate | Violin'),
      source('group', 'Duplicate Group'),
      source('member', 'Duplicate | Violin'),
    ])

    expect(screen.getAllByText('Name')).toHaveLength(3)
    expect(screen.getAllByText('Instrument')).toHaveLength(3)
    expect(screen.getByText('Group name')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox').map((field) => field.getAttribute('aria-label'))).toEqual([
      'Name: Duplicate | Violin, row 1',
      'Instrument: Duplicate | Violin, row 1',
      'Name: Duplicate | Violin, row 2',
      'Instrument: Duplicate | Violin, row 2',
      'Group name: Duplicate Group, row 3',
      'Name: Duplicate | Violin, member 1 in row 3',
      'Instrument: Duplicate | Violin, member 1 in row 3',
    ])
  })

  it('uses the native drawer title without a duplicate inner heading', () => {
    renderDrawer([source('solo', 'Tianwa Yang | Violine')])

    expect(screen.queryByRole('heading', { name: 'Convert Performers List' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Performers list conversion controls')).toBeInTheDocument()
  })
})
