import config from '@payload-config'
import { getPayload } from 'payload'
import type { Employee } from '../src/payload-types.ts'
import { createDefaultImage } from './utils/createDefaultImage.ts'

import employeesData from './seeds/employees.json'

async function getEmployeeImageId(payload: any, employee: Employee) {
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

  // If no default image exists, create one
  const defaultMedia = await createDefaultImage(payload, 'employee')
  return defaultMedia.id
}

async function run() {
  try {
    const payload = await getPayload({ config })

    for (const employeeData of employeesData.employees) {
      const imageId = await getEmployeeImageId(payload, employeeData as Employee)

      // Check if employee already exists
      const existingEmployee = await payload.find({
        collection: 'employees',
        where: {
          name: { equals: employeeData.name },
        },
        limit: 1,
      })

      if (existingEmployee.totalDocs > 0) {
        console.log(`Employee already exists: ${employeeData.name}`)
      } else {
        // Create artist with the default media reference
        const employee = {
          ...employeeData,
          image: imageId,
        } as Employee

        await payload.create({
          collection: 'employees',
          data: employee,
        })

        console.log(`Created employee: ${employeeData.name}`)
      }
    }
  } catch (error) {
    console.error(JSON.stringify(error))
    process.exit(1)
  }

  process.exit(0)
}

await run()
