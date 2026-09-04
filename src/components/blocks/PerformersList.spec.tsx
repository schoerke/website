// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PerformersList from './PerformersList'

describe('PerformersList', () => {
  it('renders a trimmed title with the yellow accent', () => {
    const { container } = render(
      <PerformersList
        title="  Mitwirkende  "
        items={[{ id: 'performer-1', blockType: 'performer', name: 'Tianwa Yang' }]}
      />
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Mitwirkende' })).toHaveClass(
      '!m-0',
      '!text-base',
      '!font-semibold',
      '!leading-snug',
      '!text-primary-black'
    )
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('bg-primary-yellow', 'h-0.5', 'w-6', 'shrink-0')
  })

  it('omits the title and accent when title is missing or blank', () => {
    const { container, rerender } = render(
      <PerformersList items={[{ id: 'performer-1', blockType: 'performer', name: 'Tianwa Yang' }]} />
    )

    expect(screen.queryByRole('heading')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()

    rerender(<PerformersList title="  " items={[{ id: 'performer-1', blockType: 'performer', name: 'Tianwa Yang' }]} />)

    expect(screen.queryByRole('heading')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('renders a trimmed performer with an accessible instrument separator and omits a blank instrument', () => {
    render(
      <PerformersList
        items={[
          { id: 'performer-1', blockType: 'performer', name: '  Tianwa Yang  ', instrument: '  Violine  ' },
          { id: 'performer-2', blockType: 'performer', name: '  Dirk Kaftan  ', instrument: '  ' },
        ]}
      />
    )

    expect(screen.getByText('Tianwa Yang')).toHaveClass('break-words', 'font-semibold')
    expect(screen.getByText('Violine')).toHaveClass('break-words', 'text-gray-500')
    expect(screen.getByText(',', { selector: '.sr-only' })).toBeInTheDocument()
    expect(screen.getByText('Dirk Kaftan')).toHaveClass('break-words', 'font-semibold')
    expect(screen.queryByText(/^\s+$/)).toBeNull()
  })

  it('renders marker-free nested semantic lists for groups', () => {
    render(
      <PerformersList
        items={[
          {
            id: 'group-1',
            blockType: 'ensembleGroup',
            groupName: '  Trio Catch  ',
            members: [
              { id: 'member-1', name: 'Martin Adamek', instrument: 'Klarinette' },
              { id: 'member-2', name: 'Romain Pageard', instrument: 'Violoncello' },
            ],
          },
        ]}
      />
    )

    const lists = screen.getAllByRole('list')
    expect(lists).toHaveLength(2)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(lists[0]).toHaveClass('!m-0', '!list-none', '!p-0', 'flex', 'flex-col', 'gap-1.5')
    expect(lists[1]).toHaveClass('!m-0', '!list-none', '!p-0', 'flex', 'flex-col', 'gap-1', '!pl-4')
    expect(screen.getByText('Trio Catch')).toHaveClass('font-semibold')
  })

  it('resets prose spacing on top-level and member list items', () => {
    render(
      <PerformersList
        items={[
          { id: 'performer-1', blockType: 'performer', name: 'Tianwa Yang' },
          {
            id: 'group-1',
            blockType: 'ensembleGroup',
            groupName: 'Trio Catch',
            members: [{ id: 'member-1', name: 'Martin Adamek' }],
          },
        ]}
      />
    )

    const [topLevelPerformer, topLevelGroup, member] = screen.getAllByRole('listitem')
    expect(topLevelPerformer).toHaveClass('!m-0', '!p-0')
    expect(topLevelGroup).toHaveClass('!m-0', '!p-0')
    expect(member).toHaveClass('!m-0', '!p-0')
  })

  it('does not render a nested list when a valid group has no valid members', () => {
    render(
      <PerformersList
        items={[
          {
            id: 'group-1',
            blockType: 'ensembleGroup',
            groupName: 'Trio Catch',
            members: [null, 'member', { id: 'member-1', name: '  ' }],
          },
        ]}
      />
    )

    expect(screen.getAllByRole('list')).toHaveLength(1)
    expect(screen.getByText('Trio Catch')).toBeInTheDocument()
  })

  it('filters malformed data and returns null without valid top-level items', () => {
    const { container, rerender } = render(<PerformersList items={null} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<PerformersList items={[null, 'performer', 1, {}, { blockType: 'unknown', name: 'Name' }]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('preserves valid top-level and member output order', () => {
    render(
      <PerformersList
        items={[
          { id: 'performer-1', blockType: 'performer', name: 'First Performer' },
          {
            id: 'group-1',
            blockType: 'ensembleGroup',
            groupName: 'Second Group',
            members: [
              { id: 'member-1', name: 'First Member' },
              { id: 'member-2', name: 'Second Member' },
            ],
          },
          { id: 'performer-2', blockType: 'performer', name: 'Third Performer' },
        ]}
      />
    )

    const lists = screen.getAllByRole('list')
    const outerItems = Array.from(lists[0].children)
    const memberItems = Array.from(lists[1].children)

    expect(outerItems[0]).toHaveTextContent('First Performer')
    expect(outerItems[1].firstElementChild?.firstElementChild).toHaveTextContent('Second Group')
    expect(outerItems[2]).toHaveTextContent('Third Performer')
    expect(memberItems.map((item) => item.textContent)).toEqual(['First Member', 'Second Member'])
  })

  it('uses the required wrap-safe row classes', () => {
    const { container } = render(
      <PerformersList
        items={[
          {
            id: 'performer-1',
            blockType: 'performer',
            name: 'MaximilianAlexanderKonstantin',
            instrument: 'KontrafagottmitLangemNamen',
          },
        ]}
      />
    )

    expect(container.querySelector('li > div')).toHaveClass('flex', 'min-w-0', 'flex-wrap', 'gap-x-2', 'gap-y-0')
  })

  it('uses wrap-safe classes on performer name and instrument spans', () => {
    render(
      <PerformersList
        items={[
          {
            id: 'performer-1',
            blockType: 'performer',
            name: 'MaximilianAlexanderKonstantin',
            instrument: 'KontrafagottmitLangemNamen',
          },
        ]}
      />
    )

    expect(screen.getByText('MaximilianAlexanderKonstantin')).toHaveClass(
      'min-w-0',
      '[overflow-wrap:anywhere]',
      'break-words',
      'font-semibold'
    )
    expect(screen.getByText('KontrafagottmitLangemNamen')).toHaveClass(
      'min-w-0',
      '[overflow-wrap:anywhere]',
      'break-words',
      'text-gray-500'
    )
  })
})
