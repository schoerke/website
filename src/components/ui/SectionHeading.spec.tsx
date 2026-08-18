// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SectionHeading from './SectionHeading'

describe('SectionHeading', () => {
  it('renders the label text inside an h2', () => {
    render(<SectionHeading>Latest News</SectionHeading>)

    const heading = screen.getByRole('heading', { level: 2, name: 'Latest News' })
    expect(heading).toBeInTheDocument()
  })

  it('renders a decorative rule before the text', () => {
    const { container } = render(<SectionHeading>Latest News</SectionHeading>)

    const rule = container.querySelector('span[aria-hidden="true"]')
    expect(rule).toBeInTheDocument()
    expect(rule).toHaveClass('bg-primary-yellow')

    // Rule must precede the heading in DOM order — visually to its left
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.children[0]).toBe(rule)
    expect(wrapper.children[1].tagName).toBe('H2')
  })

  it('applies additional className to the wrapper for alignment', () => {
    const { container } = render(<SectionHeading className="sm:justify-center">Team</SectionHeading>)

    expect(container.firstChild).toHaveClass('sm:justify-center')
  })

  it('renders without extra classes when className is omitted', () => {
    const { container } = render(<SectionHeading>Team</SectionHeading>)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('flex', 'items-center', 'gap-3')
  })
})
