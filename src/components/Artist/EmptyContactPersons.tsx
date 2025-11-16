import { GENERAL_CONTACT } from '@/constants/options'
import React from 'react'

const EmptyContactPersons: React.FC = () => (
  <section className="text-right">
    <h2>Kontakt</h2>
    <ul className="space-y-1">
      <li>
        <strong>{GENERAL_CONTACT.name}</strong>
      </li>
      <li>
        <a href={`mailto:${GENERAL_CONTACT.email}`}>{GENERAL_CONTACT.email}</a>
      </li>
      <li>
        <a href={`tel:${GENERAL_CONTACT.phone}`}>{GENERAL_CONTACT.phone}</a>
      </li>
      {GENERAL_CONTACT.mobile && (
        <li>
          <a href={`tel:${GENERAL_CONTACT.mobile}`}>{GENERAL_CONTACT.mobile}</a>
        </li>
      )}
    </ul>
  </section>
)

export default EmptyContactPersons
