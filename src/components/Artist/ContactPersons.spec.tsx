// @vitest-environment happy-dom
import { GENERAL_CONTACT } from '@/constants/contact'
import type { Employee } from '@/payload-types'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ContactPersons from './ContactPersons'

// Mock factory for complete employee
function createMockEmployee(overrides?: Partial<Employee>): Employee {
  return {
    id: 1,
    name: 'Jane Smith',
    title: 'Artist Manager',
    email: 'jane@example.com',
    phone: '+49 123 456789',
    mobile: '+49 987 654321',
    image: undefined,
    order: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ContactPersons', () => {
  describe('Empty state', () => {
    it('renders general contact when no employees provided', () => {
      render(<ContactPersons />)

      expect(screen.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()

      const emailLink = screen.getByRole('link', { name: /email.*künstlersekretariat/i })
      expect(emailLink).toHaveAttribute('href', `mailto:${GENERAL_CONTACT.email}`)
      expect(emailLink).toHaveTextContent(GENERAL_CONTACT.email)

      const phoneLink = screen.getByRole('link', { name: /phone.*künstlersekretariat/i })
      expect(phoneLink).toHaveAttribute('href', `tel:${GENERAL_CONTACT.phone}`)
      expect(phoneLink).toHaveTextContent(GENERAL_CONTACT.phone)
    })

    it('renders general contact when empty array provided', () => {
      render(<ContactPersons employees={[]} />)

      expect(screen.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /email.*künstlersekretariat/i })).toBeInTheDocument()
    })
  })

  describe('Field validation', () => {
    it('renders general contact when employee missing name', () => {
      const incomplete = createMockEmployee({ name: undefined as any })
      render(<ContactPersons employees={[incomplete]} />)

      expect(screen.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('renders general contact when employee missing title', () => {
      const incomplete = createMockEmployee({ title: undefined as any })
      render(<ContactPersons employees={[incomplete]} />)

      expect(screen.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing email', () => {
      const incomplete = createMockEmployee({ email: undefined as any })
      render(<ContactPersons employees={[incomplete]} />)

      expect(screen.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing phone', () => {
      const incomplete = createMockEmployee({ phone: undefined as any })
      render(<ContactPersons employees={[incomplete]} />)

      expect(screen.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing mobile', () => {
      const incomplete = createMockEmployee({ mobile: undefined as any })
      render(<ContactPersons employees={[incomplete]} />)

      expect(screen.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when any employee in array is incomplete', () => {
      const complete = createMockEmployee({ id: 1, name: 'Complete Person' })
      const incomplete = createMockEmployee({ id: 2, name: 'Incomplete Person', email: undefined as any })

      render(<ContactPersons employees={[complete, incomplete]} />)

      expect(screen.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
      expect(screen.queryByText('Complete Person')).not.toBeInTheDocument()
      expect(screen.queryByText('Incomplete Person')).not.toBeInTheDocument()
    })
  })

  describe('Complete employee rendering', () => {
    it('renders single employee with all details', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Artist Manager')).toBeInTheDocument()

      const emailLink = screen.getByRole('link', { name: /email jane smith/i })
      expect(emailLink).toHaveAttribute('href', 'mailto:jane@example.com')
      expect(emailLink).toHaveTextContent('jane@example.com')

      const phoneLink = screen.getByRole('link', { name: /phone jane smith/i })
      expect(phoneLink).toHaveAttribute('href', 'tel:+49 123 456789')
      expect(phoneLink).toHaveTextContent('+49 123 456789')

      const mobileLink = screen.getByRole('link', { name: /mobile jane smith/i })
      expect(mobileLink).toHaveAttribute('href', 'tel:+49 987 654321')
      expect(mobileLink).toHaveTextContent('+49 987 654321')
    })

    it('renders multiple complete employees', () => {
      const employees = [
        createMockEmployee({ id: 1, name: 'Jane Smith', title: 'Manager' }),
        createMockEmployee({ id: 2, name: 'John Doe', title: 'Assistant', email: 'john@example.com' }),
      ]
      render(<ContactPersons employees={employees} />)

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Manager')).toBeInTheDocument()

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Assistant')).toBeInTheDocument()

      expect(screen.queryByText(GENERAL_CONTACT.name)).not.toBeInTheDocument()
    })

    it('does not render general contact when all employees are complete', () => {
      const employees = [createMockEmployee({ id: 1 }), createMockEmployee({ id: 2 })]
      render(<ContactPersons employees={employees} />)

      expect(screen.queryByText(GENERAL_CONTACT.name)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('uses semantic address element', () => {
      const employee = createMockEmployee()
      const { container } = render(<ContactPersons employees={[employee]} />)

      const addresses = container.querySelectorAll('address')
      expect(addresses).toHaveLength(1)
    })

    it('has proper aria-labels for links', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      expect(screen.getByRole('link', { name: /email jane smith/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /phone jane smith/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /mobile jane smith/i })).toBeInTheDocument()
    })

    it('has focus styles on all links', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        expect(link).toHaveClass('focus:ring-2')
      })
    })
  })

  describe('Layout', () => {
    it('renders in a section element', () => {
      const employee = createMockEmployee()
      const { container } = render(<ContactPersons employees={[employee]} />)

      const section = container.querySelector('section')
      expect(section).toBeInTheDocument()
    })

    it('uses list for multiple employees', () => {
      const employees = [createMockEmployee({ id: 1 }), createMockEmployee({ id: 2 })]
      render(<ContactPersons employees={employees} />)

      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(2)
    })
  })
})
