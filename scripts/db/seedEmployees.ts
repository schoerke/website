import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import type { Employee } from '../../src/payload-types.ts'
import { getEmployeeByName, getEmployeeImageId } from '../../src/services/employee.ts'

import employeesData from './json/employees.json'

async function getDefaultMedia(payload: any) {
  // Try to find existing media first
  const existingMedia = await payload.find({
    where: {
      filename: { equals: 'default-avatar.webp' },
    },
    collection: 'media',
    limit: 1,
  })

  if (existingMedia.totalDocs > 0) {
    return existingMedia.docs[0].id
  }

  // If not found, upload from assets folder
  const assetsPath = path.join(process.cwd(), 'assets', 'default-avatar.webp')

  if (fs.existsSync(assetsPath)) {
    const fileData = fs.readFileSync(assetsPath)

    const media = await payload.create({
      collection: 'media',
      data: {
        alt: 'Default Avatar',
      },
      file: {
        data: fileData,
        mimetype: 'image/webp',
        name: 'default-avatar.webp',
      },
    })

    console.log('Uploaded default avatar from assets folder')
    return media.id
  }

  return null
}

async function getImageId(payload: any, employee: Employee) {
  // Try to find existing media first
  const employeeImageId = await getEmployeeImageId(payload, employee)

  if (employeeImageId) {
    return employeeImageId
  }

  // Fall back to default media
  return await getDefaultMedia(payload)
}

async function run() {
  try {
    const payload = await getPayload({ config })

    for (const employeeData of employeesData.employees) {
      const imageId = await getImageId(payload, employeeData as Employee)

      // Check if employee already exists
      const existingEmployee = await getEmployeeByName(payload, employeeData.name)

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
