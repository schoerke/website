// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import EmptyRecordings from '@/components/Recording/EmptyRecordings'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => {
    const messages: Record<string, string> = {
      discography: 'No discography available.',
    }
    return messages[key] ?? key
  }),
}))

describe('EmptyRecordings', () => {
  it('renders the discography empty message', async () => {
    const component = await EmptyRecordings()
    render(component)

    expect(screen.getByText('No discography available.')).toBeInTheDocument()
  })

  it('renders a centered text container', async () => {
    const component = await EmptyRecordings()
    const { container } = render(component)

    const div = container.firstChild as HTMLElement
    expect(div).toHaveClass('text-center')
  })
})
