// @vitest-environment happy-dom

import { createMockEmployee, createMockImage } from '@/tests/utils/payloadMocks'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ContactPageLayout from './ContactPageLayout'

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}))

const baseProps = {
  title: 'Contact',
  locale: 'en' as const,
  phoneLabel: 'Phone',
  mobileLabel: 'Mobile',
  employees: [createMockEmployee({ id: 1, name: 'Jane Smith', title: 'Senior Manager' })],
}

describe('ContactPageLayout', () => {
  it('renders dog card when dogImage is provided', () => {
    render(
      <ContactPageLayout
        {...baseProps}
        dogImage={createMockImage({ id: 99, url: '/dog.jpg', alt: 'Yuki' })}
        dogName="Yuki"
        dogTitle="Office Dog"
      />
    )

    expect(screen.getByText('Yuki')).toBeInTheDocument()
    expect(screen.getByText('Office Dog')).toBeInTheDocument()
    expect(screen.getByAltText('Yuki')).toHaveAttribute('src', '/dog.jpg')
    expect(screen.getByAltText('Yuki')).toHaveAttribute('class', expect.stringContaining('grayscale'))
  })

  it('renders employee cards', () => {
    render(<ContactPageLayout {...baseProps} />)

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Senior Manager')).toBeInTheDocument()
  })

  it('does not render dog card when dogImage is missing', () => {
    render(<ContactPageLayout {...baseProps} dogImage={null} dogName="Yuki" dogTitle="Office Dog" />)

    expect(screen.queryByText('Office Dog')).not.toBeInTheDocument()
  })
})
