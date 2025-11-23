import type { Payload } from 'payload'
import type { Employee } from '../payload-types'
import { getDefaultAvatar, getMediaByAlt } from './media'

type LocaleCode = 'de' | 'en' | 'all'

export const getEmployees = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'employees',
    locale: locale || 'de',
    sort: 'order',
  })
}

export const getEmployeeById = async (payload: Payload, id: string, locale?: LocaleCode) => {
  return await payload.findByID({
    collection: 'artists',
    id: id,
    locale: locale || 'de',
  })
}

export const getEmployeeByName = async (payload: Payload, name: string, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'employees',
    where: {
      name: { equals: name },
    },
    limit: 1,
    locale: locale || 'de',
  })
}

export async function getEmployeeImageId(payload: Payload, employee: Employee) {
  // Try to find existing media first
  const employeeImage = await getMediaByAlt(payload, employee.name)

  if (employeeImage) {
    return employeeImage.id
  }

  // Otherwise use a default image
  const defaultAvatar = await getDefaultAvatar(payload)

  if (defaultAvatar) {
    return defaultAvatar.id
  }

  return null
}
