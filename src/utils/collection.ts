import type { Employee } from '@/payload-types'

export function isEmployee(obj: unknown): obj is Employee {
  if (typeof obj !== 'object' || obj === null) return false
  if (!('id' in obj && 'name' in obj && 'email' in obj)) return false

  const candidate = obj as { id: unknown; name: unknown; email: unknown }
  return typeof candidate.id === 'number' && typeof candidate.name === 'string' && typeof candidate.email === 'string'
}
