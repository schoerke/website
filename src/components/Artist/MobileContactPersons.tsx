import { GENERAL_CONTACT } from '@/constants/contact'
import type { Employee } from '@/payload-types'
import { Mail, Phone, Smartphone } from 'lucide-react'
import React from 'react'
import { CONTACT_PERSONS_TESTIDS } from './ContactPersons'

const MOBILE_ICON_BUTTON_CLASSNAME =
  'flex h-10 w-10 items-center justify-center rounded-full bg-primary-black/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
const MOBILE_ICON_CLASSNAME = 'text-primary-yellow h-5 w-5'

export const MobileEmptyContactPersons: React.FC = () => {
  return (
    <section className="md:hidden" data-testid={CONTACT_PERSONS_TESTIDS.mobile}>
      <ul className="flex flex-col gap-4">
        <li className="flex items-center justify-between gap-3">
          <div>
            <strong>{GENERAL_CONTACT.name}</strong>
          </div>
          <address className="flex gap-2 not-italic">
            <a
              href={`mailto:${GENERAL_CONTACT.email}`}
              aria-label={`Email ${GENERAL_CONTACT.name}`}
              className={MOBILE_ICON_BUTTON_CLASSNAME}
            >
              <Mail className={MOBILE_ICON_CLASSNAME} aria-hidden="true" />
            </a>
            <a
              href={`tel:${GENERAL_CONTACT.phone}`}
              aria-label={`Phone ${GENERAL_CONTACT.name}`}
              className={MOBILE_ICON_BUTTON_CLASSNAME}
            >
              <Phone className={MOBILE_ICON_CLASSNAME} aria-hidden="true" />
            </a>
          </address>
        </li>
      </ul>
    </section>
  )
}

export type MobileContactPersonsProps = {
  employees: Employee[]
}

export const MobileContactPersons: React.FC<MobileContactPersonsProps> = ({ employees }) => {
  return (
    <section className="md:hidden" data-testid={CONTACT_PERSONS_TESTIDS.mobile}>
      <ul className="flex flex-col gap-4">
        {employees.map((emp) => (
          <li key={emp.id} className="flex items-center justify-between gap-3">
            <div>
              <strong>{emp.name}</strong>
              <div className="text-sm text-gray-600">{emp.title}</div>
            </div>
            <address className="flex gap-2 not-italic">
              <a href={`mailto:${emp.email}`} aria-label={`Email ${emp.name}`} className={MOBILE_ICON_BUTTON_CLASSNAME}>
                <Mail className={MOBILE_ICON_CLASSNAME} aria-hidden="true" />
              </a>
              <a href={`tel:${emp.phone}`} aria-label={`Phone ${emp.name}`} className={MOBILE_ICON_BUTTON_CLASSNAME}>
                <Phone className={MOBILE_ICON_CLASSNAME} aria-hidden="true" />
              </a>
              <a href={`tel:${emp.mobile}`} aria-label={`Mobile ${emp.name}`} className={MOBILE_ICON_BUTTON_CLASSNAME}>
                <Smartphone className={MOBILE_ICON_CLASSNAME} aria-hidden="true" />
              </a>
            </address>
          </li>
        ))}
      </ul>
    </section>
  )
}
