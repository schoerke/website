import type { Payload } from 'payload'
import type { Employee } from '../payload-types'

export const getEmployees = async (payload: Payload) => {
  return await payload.find({
    collection: 'employees',
  })
}

export const getEmployeeById = async (payload: Payload, id: string) => {
  return await payload.findByID({
    collection: 'artists',
    id: id,
  })
}

export const getEmployeeByName = async (payload: Payload, name: string) => {
  return await payload.find({
    collection: 'employees',
    where: {
      name: { equals: name },
    },
    limit: 1,
  })
}

export async function getEmployeeImageId(payload: Payload, employee: Employee) {
  // Try to find existing media first
  const employeeImage = await payload.find({
    collection: 'media',
    where: {
      alt: { equals: employee.name },
    },
    limit: 1,
  })

  if (employeeImage.totalDocs > 0) {
    return employeeImage.docs[0].id
  }

  // Otherwise use a default image
  const defaultAvatar = await payload.find({
    where: {
      filename: { equals: 'default-avatar.webp' },
    },
    collection: 'media',
    limit: 1,
  })

  if (defaultAvatar.totalDocs > 0) {
    return defaultAvatar.docs[0].id
  }

  return null
}
