// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FeaturedQuote from './FeaturedQuote'

describe('FeaturedQuote', () => {
  it('renders the quote text inside a blockquote', () => {
    render(<FeaturedQuote quote="Music is the universal language" />)

    const quote = screen.getByText('Music is the universal language')
    expect(quote.tagName).toBe('BLOCKQUOTE')
    expect(quote).toHaveClass('border-l-4', 'border-primary-yellow')
  })
})
