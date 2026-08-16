import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { resolveDefaultCreatedBy } from './resolveDefaultCreatedBy'

const asArgs = (args: { req: unknown }) => args as Parameters<typeof resolveDefaultCreatedBy>[0]

const createMockReq = (user: { email?: string } | undefined, docs: { id: number }[] = []): PayloadRequest =>
  ({
    user,
    payload: {
      find: vi.fn().mockResolvedValue({ docs }),
    },
  }) as unknown as PayloadRequest

describe('resolveDefaultCreatedBy', () => {
  it('returns the employee id for a logged-in user with a matching employee email', async () => {
    const req = createMockReq({ email: 'e.wagner@ks-schoerke.de' }, [{ id: 4 }])

    const result = await resolveDefaultCreatedBy(asArgs({ req }))

    expect(result).toBe(4)
    expect(req.payload.find).toHaveBeenCalledWith({
      collection: 'employees',
      where: { email: { equals: 'e.wagner@ks-schoerke.de' } },
      limit: 1,
    })
  })

  it('returns undefined when no employee has the user email', async () => {
    const req = createMockReq({ email: 'zeitchef@gmail.com' })

    const result = await resolveDefaultCreatedBy(asArgs({ req }))

    expect(result).toBeUndefined()
  })

  it('returns undefined when user has no email', async () => {
    const req = createMockReq({})

    const result = await resolveDefaultCreatedBy(asArgs({ req }))

    expect(result).toBeUndefined()
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it('returns undefined when there is no logged-in user', async () => {
    const req = createMockReq(undefined)

    const result = await resolveDefaultCreatedBy(asArgs({ req }))

    expect(result).toBeUndefined()
    expect(req.payload.find).not.toHaveBeenCalled()
  })
})
