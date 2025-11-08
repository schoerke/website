import config from '@payload-config'
import { getPayload } from 'payload'
import type { Employee } from '../src/payload-types.ts'
import { getEmployeeByName, getEmployeeImageId } from '../src/services/employee.ts'
import { createDefaultImage } from './utils/createDefaultImage.ts'

import employeesData from './seeds/employees.json'

async function getImageId(payload: any, employee: Employee) {
  // Try to find existing media first
  const employeeImageId = await getEmployeeImageId(employee)

  if (employeeImageId) {
    return employeeImageId
  }

  // If no default image exists, create one
  const defaultMedia = await createDefaultImage(payload, 'employee')
  return defaultMedia.id
}

async function run() {
  try {
    const payload = await getPayload({ config })

    for (const employeeData of employeesData.employees) {
      const imageId = await getImageId(payload, employeeData as Employee)

      // Check if employee already exists
      const existingEmployee = await getEmployeeByName(employeeData.name)

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
