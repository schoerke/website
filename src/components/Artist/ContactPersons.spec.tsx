// @vitest-environment happy-dom
import { GENERAL_CONTACT } from '@/constants/contact'
import type { Employee } from '@/payload-types'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ContactPersons, { CONTACT_PERSONS_TESTIDS, MobileContactPersonsSection } from './ContactPersons'

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

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()

      const emailLink = desktop.getByRole('link', { name: /email.*künstlersekretariat/i })
      expect(emailLink).toHaveAttribute('href', `mailto:${GENERAL_CONTACT.email}`)
      expect(emailLink).toHaveTextContent(GENERAL_CONTACT.email)

      const phoneLink = desktop.getByRole('link', { name: /phone.*künstlersekretariat/i })
      expect(phoneLink).toHaveAttribute('href', `tel:${GENERAL_CONTACT.phone}`)
      expect(phoneLink).toHaveTextContent(GENERAL_CONTACT.phone)
    })

    it('renders general contact when empty array provided', () => {
      render(<ContactPersons employees={[]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
      expect(desktop.getByRole('link', { name: /email.*künstlersekretariat/i })).toBeInTheDocument()
    })
  })

  describe('Field validation', () => {
    it('renders general contact when employee missing name', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, name: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
      expect(desktop.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('renders general contact when employee missing title', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, title: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing email', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, email: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing phone', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, phone: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing mobile', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, mobile: '' }
      render(<ContactPersons employees={[incomplete]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when any employee in array is incomplete', () => {
      const complete = createMockEmployee({ id: 1, name: 'Complete Person' })
      const baseIncomplete = createMockEmployee({ id: 2, name: 'Incomplete Person' })
      const incomplete = { ...baseIncomplete, email: '' }

      render(<ContactPersons employees={[complete, incomplete]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
      expect(desktop.queryByText('Complete Person')).not.toBeInTheDocument()
      expect(desktop.queryByText('Incomplete Person')).not.toBeInTheDocument()
    })
  })

  describe('Complete employee rendering', () => {
    it('renders single employee with all details', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText('Jane Smith')).toBeInTheDocument()
      expect(desktop.getByText('Artist Manager')).toBeInTheDocument()

      const emailLink = desktop.getByRole('link', { name: /email jane smith/i })
      expect(emailLink).toHaveAttribute('href', 'mailto:jane@example.com')
      expect(emailLink).toHaveTextContent('jane@example.com')

      const phoneLink = desktop.getByRole('link', { name: /phone jane smith/i })
      expect(phoneLink).toHaveAttribute('href', 'tel:+49 123 456789')
      expect(phoneLink).toHaveTextContent('+49 123 456789')

      const mobileLink = desktop.getByRole('link', { name: /mobile jane smith/i })
      expect(mobileLink).toHaveAttribute('href', 'tel:+49 987 654321')
      expect(mobileLink).toHaveTextContent('+49 987 654321')
    })

    it('renders multiple complete employees', () => {
      const employees = [
        createMockEmployee({ id: 1, name: 'Jane Smith', title: 'Manager' }),
        createMockEmployee({ id: 2, name: 'John Doe', title: 'Assistant', email: 'john@example.com' }),
      ]
      render(<ContactPersons employees={employees} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByText('Jane Smith')).toBeInTheDocument()
      expect(desktop.getByText('Manager')).toBeInTheDocument()

      expect(desktop.getByText('John Doe')).toBeInTheDocument()
      expect(desktop.getByText('Assistant')).toBeInTheDocument()

      expect(desktop.queryByText(GENERAL_CONTACT.name)).not.toBeInTheDocument()
    })

    it('does not render general contact when all employees are complete', () => {
      const employees = [createMockEmployee({ id: 1 }), createMockEmployee({ id: 2 })]
      render(<ContactPersons employees={employees} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.queryByText(GENERAL_CONTACT.name)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('uses semantic address element', () => {
      const employee = createMockEmployee()
      const { container } = render(<ContactPersons employees={[employee]} />)

      const desktopSection = container.querySelector(`[data-testid="${CONTACT_PERSONS_TESTIDS.desktop}"]`)
      const addresses = desktopSection?.querySelectorAll('address')
      expect(addresses).toHaveLength(1)
    })

    it('has proper aria-labels for links', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      expect(desktop.getByRole('link', { name: /email jane smith/i })).toBeInTheDocument()
      expect(desktop.getByRole('link', { name: /phone jane smith/i })).toBeInTheDocument()
      expect(desktop.getByRole('link', { name: /mobile jane smith/i })).toBeInTheDocument()
    })

    it('has focus styles on all links', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      const links = desktop.getAllByRole('link')
      links.forEach((link) => {
        expect(link).toHaveClass('focus:ring-2')
      })
    })
  })

  describe('Layout', () => {
    it('renders in a section element', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      const section = screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop)
      expect(section.tagName).toBe('SECTION')
    })

    it('uses list for multiple employees', () => {
      const employees = [createMockEmployee({ id: 1 }), createMockEmployee({ id: 2 })]
      render(<ContactPersons employees={employees} />)

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      const list = desktop.getByRole('list')
      expect(list).toBeInTheDocument()

      const listItems = desktop.getAllByRole('listitem')
      expect(listItems).toHaveLength(2)
    })

    it('desktop section is hidden below sm and visible at sm and up', () => {
      const employee = createMockEmployee()
      render(<ContactPersons employees={[employee]} />)

      const section = screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop)
      expect(section).toHaveClass('hidden')
      expect(section).toHaveClass('sm:block')
    })
  })
})

describe('MobileContactPersonsSection', () => {
  describe('Empty state', () => {
    it('renders general contact with Mail and Phone icon links, no mobile field', () => {
      render(<MobileContactPersonsSection />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()

      const emailLink = mobile.getByRole('link', { name: /email.*künstlersekretariat/i })
      expect(emailLink).toHaveAttribute('href', `mailto:${GENERAL_CONTACT.email}`)

      const phoneLink = mobile.getByRole('link', { name: /phone.*künstlersekretariat/i })
      expect(phoneLink).toHaveAttribute('href', `tel:${GENERAL_CONTACT.phone}`)

      // No mobile icon for general contact (no mobile field in GeneralContactInfo)
      expect(mobile.queryByRole('link', { name: /mobile.*künstlersekretariat/i })).not.toBeInTheDocument()
    })

    it('mobile section is visible below sm and hidden at sm and up', () => {
      render(<MobileContactPersonsSection />)

      const section = screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile)
      expect(section).toHaveClass('sm:hidden')
    })

    it('mobile icons are decorative (aria-hidden) since parent link has aria-label', () => {
      const { container } = render(<MobileContactPersonsSection />)

      const mobileSection = container.querySelector(`[data-testid="${CONTACT_PERSONS_TESTIDS.mobile}"]`)
      const icons = mobileSection?.querySelectorAll('svg')
      expect(icons?.length).toBeGreaterThan(0)
      icons?.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('Complete employee rendering', () => {
    it('renders single employee with icon links for email, phone, mobile', () => {
      const employee = createMockEmployee()
      render(<MobileContactPersonsSection employees={[employee]} />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))

      expect(mobile.getByText('Jane Smith')).toBeInTheDocument()
      expect(mobile.getByText('Artist Manager')).toBeInTheDocument()

      const emailLink = mobile.getByRole('link', { name: /email jane smith/i })
      expect(emailLink).toHaveAttribute('href', 'mailto:jane@example.com')

      const phoneLink = mobile.getByRole('link', { name: /phone jane smith/i })
      expect(phoneLink).toHaveAttribute('href', 'tel:+49 123 456789')

      const mobileLink = mobile.getByRole('link', { name: /mobile jane smith/i })
      expect(mobileLink).toHaveAttribute('href', 'tel:+49 987 654321')
    })

    it('renders multiple complete employees', () => {
      const employees = [
        createMockEmployee({ id: 1, name: 'Jane Smith', title: 'Manager' }),
        createMockEmployee({ id: 2, name: 'John Doe', title: 'Assistant', email: 'john@example.com' }),
      ]
      render(<MobileContactPersonsSection employees={employees} />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))

      expect(mobile.getByText('Jane Smith')).toBeInTheDocument()
      expect(mobile.getByText('Manager')).toBeInTheDocument()
      expect(mobile.getByText('John Doe')).toBeInTheDocument()
      expect(mobile.getByText('Assistant')).toBeInTheDocument()
      expect(mobile.queryByText(GENERAL_CONTACT.name)).not.toBeInTheDocument()
    })

    it('uses semantic address element per employee', () => {
      const employee = createMockEmployee()
      const { container } = render(<MobileContactPersonsSection employees={[employee]} />)

      const mobileSection = container.querySelector(`[data-testid="${CONTACT_PERSONS_TESTIDS.mobile}"]`)
      const addresses = mobileSection?.querySelectorAll('address')
      expect(addresses).toHaveLength(1)
    })

    it('uses list for multiple employees', () => {
      const employees = [createMockEmployee({ id: 1 }), createMockEmployee({ id: 2 })]
      render(<MobileContactPersonsSection employees={employees} />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))
      const list = mobile.getByRole('list')
      expect(list).toBeInTheDocument()

      const listItems = mobile.getAllByRole('listitem')
      expect(listItems).toHaveLength(2)
    })

    it('has focus styles on all mobile links', () => {
      const employee = createMockEmployee()
      render(<MobileContactPersonsSection employees={[employee]} />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))
      const links = mobile.getAllByRole('link')
      links.forEach((link) => {
        expect(link).toHaveClass('focus:ring-2')
      })
    })
  })

  describe('Field validation (falls back to MobileEmptyContactPersons)', () => {
    it('renders general contact when employee missing name', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, name: '' }
      render(<MobileContactPersonsSection employees={[incomplete]} />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
      expect(mobile.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('renders general contact when employee missing title', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, title: '' }
      render(<MobileContactPersonsSection employees={[incomplete]} />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing email', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, email: '' }
      render(<MobileContactPersonsSection employees={[incomplete]} />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing phone', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, phone: '' }
      render(<MobileContactPersonsSection employees={[incomplete]} />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })

    it('renders general contact when employee missing mobile', () => {
      const baseEmployee = createMockEmployee()
      const incomplete = { ...baseEmployee, mobile: '' }
      render(<MobileContactPersonsSection employees={[incomplete]} />)

      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))
      expect(mobile.getByText(GENERAL_CONTACT.name)).toBeInTheDocument()
    })
  })

  describe('Desktop/mobile parity', () => {
    it('renders the same set of mailto/tel links on desktop and mobile', () => {
      const employees = [
        createMockEmployee({ id: 1, name: 'Jane Smith' }),
        createMockEmployee({ id: 2, name: 'John Doe', email: 'john@example.com' }),
      ]
      render(
        <>
          <ContactPersons employees={employees} />
          <MobileContactPersonsSection employees={employees} />
        </>
      )

      const desktop = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.desktop))
      const mobile = within(screen.getByTestId(CONTACT_PERSONS_TESTIDS.mobile))

      const desktopHrefs = desktop
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
        .sort()
      const mobileHrefs = mobile
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
        .sort()

      expect(mobileHrefs).toEqual(desktopHrefs)
    })
  })
})
