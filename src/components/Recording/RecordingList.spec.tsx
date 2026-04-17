// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import RecordingList from '@/components/Recording/RecordingList'
import { createMockRecording } from '@/tests/utils/payloadMocks'

vi.mock('@/components/Recording/RecordingListItem', () => ({
  default: ({ recording }: { recording: { title: string } }) => (
    <li data-testid="recording-list-item">{recording.title}</li>
  ),
}))

describe('RecordingList', () => {
  it('renders a list item for each recording', () => {
    const recordings = [
      createMockRecording({ id: 1, title: 'Beethoven - Violin Concerto' }),
      createMockRecording({ id: 2, title: 'Brahms - Piano Concerto No. 1' }),
    ]
    render(<RecordingList recordings={recordings} />)

    expect(screen.getAllByTestId('recording-list-item')).toHaveLength(2)
    expect(screen.getByText('Beethoven - Violin Concerto')).toBeInTheDocument()
    expect(screen.getByText('Brahms - Piano Concerto No. 1')).toBeInTheDocument()
  })

  it('renders nothing when recordings list is empty', () => {
    const { container } = render(<RecordingList recordings={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a single recording', () => {
    const recordings = [createMockRecording({ title: 'Mozart - Clarinet Concerto' })]
    render(<RecordingList recordings={recordings} />)

    expect(screen.getAllByTestId('recording-list-item')).toHaveLength(1)
  })

  it('uses filterKey as the list key for re-animation', () => {
    const recordings = [createMockRecording({ title: 'Test Recording' })]
    const { container } = render(<RecordingList recordings={recordings} filterKey="violin" />)

    const list = container.querySelector('ul')
    expect(list).toBeInTheDocument()
  })
})
