import { GENERAL_CONTACT } from '@/constants/contact'
import type { Employee } from '@/payload-types'
import React from 'react'

export type ContactPersonsProps = {
  employees?: Employee[]
}

const REQUIRED_FIELDS: (keyof Employee)[] = ['name', 'title', 'email', 'phone', 'mobile']

const hasAllFields = (employee: Employee) => REQUIRED_FIELDS.every((field) => Boolean(employee && employee[field]))

const ContactPersons: React.FC<ContactPersonsProps> = ({ employees }) => {
  const showGeneral = !employees || employees.length === 0 || employees.some((emp) => !hasAllFields(emp))

  const EmptyContactPersons: React.FC = () => {
    return (
      <section className="sm:text-left lg:text-right">
        <ul className="flex justify-between gap-4 md:items-center md:justify-start md:gap-16 md:space-y-0 lg:block lg:space-y-4">
          <li>
            <div>
              <strong>{GENERAL_CONTACT.name}</strong>
            </div>
            <div>
              <a href={`mailto:${GENERAL_CONTACT.email}`}>{GENERAL_CONTACT.email}</a>
            </div>
            <div>
              <a href={`tel:${GENERAL_CONTACT.phone}`}>{GENERAL_CONTACT.phone}</a>
            </div>
          </li>
        </ul>
      </section>
    )
  }

  if (showGeneral) {
    return <EmptyContactPersons />
  }

  return (
    <section className="sm:text-left lg:text-right">
      <ul className="flex justify-between gap-4 md:items-center md:justify-start md:gap-16 md:space-y-0 lg:block lg:space-y-4">
        {employees.map((emp) => (
          <li key={emp.id} className="">
            <div>
              <strong>{emp.name}</strong>
            </div>
            <div>{emp.title}</div>
            <div>
              <a href={`mailto:${emp.email}`}>{emp.email}</a>
            </div>
            <div>
              <a href={`tel:${emp.phone}`}>{emp.phone}</a>
            </div>
            <div>
              <a href={`tel:${emp.mobile}`}>{emp.mobile}</a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ContactPersons
