import { GENERAL_CONTACT } from '@/constants/contact'
import type { Employee } from '@/payload-types'
import React from 'react'

export type ContactPersonsProps = {
  employees?: Employee[]
}

const REQUIRED_FIELDS: (keyof Employee)[] = ['name', 'title', 'email', 'phone', 'mobile']

function hasAllFields(employee: Employee): boolean {
  return REQUIRED_FIELDS.every((field) => Boolean(employee && employee[field]))
}

const EmptyContactPersons: React.FC = () => {
  return (
    <section className="sm:text-left md:text-right">
      <ul className="flex gap-6 md:flex-col md:gap-4">
        <li>
          <div>
            <strong>{GENERAL_CONTACT.name}</strong>
          </div>
          <address className="not-italic">
            <div className="text-sm">
              <a
                href={`mailto:${GENERAL_CONTACT.email}`}
                className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Email ${GENERAL_CONTACT.name}`}
              >
                {GENERAL_CONTACT.email}
              </a>
            </div>
            <div className="text-sm">
              <a
                href={`tel:${GENERAL_CONTACT.phone}`}
                className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Phone ${GENERAL_CONTACT.name}`}
              >
                {GENERAL_CONTACT.phone}
              </a>
            </div>
          </address>
        </li>
      </ul>
    </section>
  )
}

const ContactPersons: React.FC<ContactPersonsProps> = ({ employees }) => {
  const showGeneral = !employees || employees.length === 0 || employees.some((emp) => !hasAllFields(emp))

  if (showGeneral) {
    return <EmptyContactPersons />
  }

  return (
    <section className="sm:text-left md:text-right">
      <ul className="flex gap-6 md:flex-col md:gap-4">
        {employees.map((emp) => {
          return (
            <li key={emp.id}>
              {/* Contact details */}
              <div>
                <div>
                  <strong>{emp.name}</strong>
                </div>
                <div className="text-sm text-gray-600">{emp.title}</div>

                <address className="not-italic">
                  <div className="text-sm">
                    <a
                      href={`mailto:${emp.email}`}
                      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label={`Email ${emp.name}`}
                    >
                      {emp.email}
                    </a>
                  </div>
                  <div className="text-sm">
                    <a
                      href={`tel:${emp.phone}`}
                      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label={`Phone ${emp.name}`}
                    >
                      {emp.phone}
                    </a>
                  </div>
                  <div className="text-sm">
                    <a
                      href={`tel:${emp.mobile}`}
                      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label={`Mobile ${emp.name}`}
                    >
                      {emp.mobile}
                    </a>
                  </div>
                </address>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default ContactPersons
