// @vitest-environment happy-dom

import { createMockEmployee } from '@/tests/utils/payloadMocks'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TeamMemberCard from './TeamMemberCard'

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}))

const defaultEmployee = createMockEmployee({
  id: 1,
  name: 'Jane Smith',
  title: 'Senior Manager',
  email: 'jane@example.com',
  phone: '+49 611 111111',
  mobile: '+49 171 222222',
  image: { id: 10, url: '/jane.jpg', alt: 'Jane', updatedAt: '', createdAt: '' },
})

describe('TeamMemberCard', () => {
  it('renders name and title', () => {
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Phone" mobileLabel="Mobile" />)
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Senior Manager')).toBeInTheDocument()
  })

  it('renders email as mailto link', () => {
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Phone" mobileLabel="Mobile" />)
    const link = screen.getByRole('link', { name: 'jane@example.com' })
    expect(link).toHaveAttribute('href', 'mailto:jane@example.com')
  })

  it('renders phone as tel link with label', () => {
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Telefon" mobileLabel="Mobil" />)
    const link = screen.getByRole('link', { name: /Telefon/ })
    expect(link).toHaveAttribute('href', 'tel:+49 611 111111')
  })

  it('renders mobile as tel link with label', () => {
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Telefon" mobileLabel="Mobil" />)
    const link = screen.getByRole('link', { name: /Mobil/ })
    expect(link).toHaveAttribute('href', 'tel:+49 171 222222')
  })

  it('renders image when populated relationship is provided', () => {
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Phone" mobileLabel="Mobile" />)
    const img = screen.getByAltText('Jane Smith')
    expect(img).toHaveAttribute('src', '/jane.jpg')
  })

  it('falls back to a UserRound icon placeholder when image is a numeric ID (unpopulated)', () => {
    render(<TeamMemberCard {...defaultEmployee} image={5} phoneLabel="Phone" mobileLabel="Mobile" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('team-member-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to a UserRound icon placeholder when image is null', () => {
    render(<TeamMemberCard {...defaultEmployee} image={null} phoneLabel="Phone" mobileLabel="Mobile" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('team-member-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to a UserRound icon placeholder when image URL is missing', () => {
    render(
      <TeamMemberCard
        {...defaultEmployee}
        image={{ id: 10, alt: 'Jane', updatedAt: '', createdAt: '' }}
        phoneLabel="Phone"
        mobileLabel="Mobile"
      />
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('team-member-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to a UserRound icon placeholder when image URL is the /null artifact', () => {
    render(
      <TeamMemberCard
        {...defaultEmployee}
        image={{ id: 10, url: '/api/images/file/null', alt: 'Jane', updatedAt: '', createdAt: '' }}
        phoneLabel="Phone"
        mobileLabel="Mobile"
      />
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('team-member-image-placeholder')).toBeInTheDocument()
  })

  it('does not render email link when email is empty', () => {
    render(<TeamMemberCard {...defaultEmployee} email="" phoneLabel="Phone" mobileLabel="Mobile" />)
    expect(screen.queryByRole('link', { name: /mailto/ })).not.toBeInTheDocument()
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument()
  })

  it('does not render phone when phone is empty', () => {
    render(<TeamMemberCard {...defaultEmployee} phone="" phoneLabel="Phone" mobileLabel="Mobile" />)
    expect(screen.queryByRole('link', { name: /Phone/ })).not.toBeInTheDocument()
  })

  it('does not render mobile when mobile is empty', () => {
    render(<TeamMemberCard {...defaultEmployee} mobile="" phoneLabel="Phone" mobileLabel="Mobile" />)
    expect(screen.queryByRole('link', { name: /Mobile/ })).not.toBeInTheDocument()
  })

  it('first card uses priority image loading', () => {
    // priority prop is passed from parent — just verify it's accepted without error
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Phone" mobileLabel="Mobile" priority={true} />)
    expect(screen.getByAltText('Jane Smith')).toBeInTheDocument()
  })

  it('applies grayscale class to image when grayscale prop is true', () => {
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Phone" mobileLabel="Mobile" grayscale={true} />)
    const img = screen.getByAltText('Jane Smith')
    expect(img).toHaveAttribute('class', expect.stringContaining('grayscale'))
  })

  it('omits grayscale class when grayscale prop is false', () => {
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Phone" mobileLabel="Mobile" />)
    const img = screen.getByAltText('Jane Smith')
    expect(img).not.toHaveAttribute('class', expect.stringContaining('grayscale'))
  })
})
