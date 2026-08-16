import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { resolveAccountAvatarImage } from './avatar'

const asPayload = (find: unknown) => ({ find }) as unknown as Payload

describe('resolveAccountAvatarImage', () => {
  it('returns the employee thumbnail url for a matching employee email', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [
        {
          image: {
            url: '/api/images/file/eva-wagner.jpg',
            sizes: { thumbnail: { url: '/api/images/file/eva-wagner-400x300.webp' } },
          },
        },
      ],
    })

    const result = await resolveAccountAvatarImage(asPayload(find), 'e.wagner@ks-schoerke.de')

    expect(result).toBe('/api/images/file/eva-wagner-400x300.webp')
    expect(find).toHaveBeenCalledWith({
      collection: 'employees',
      where: { email: { equals: 'e.wagner@ks-schoerke.de' } },
      depth: 1,
      limit: 1,
    })
  })

  it('falls back to the full image url when no thumbnail size exists', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ image: { url: '/api/images/file/p.jpg' } }] })

    const result = await resolveAccountAvatarImage(asPayload(find), 't.nurnus@ks-schoerke.de')

    expect(result).toBe('/api/images/file/p.jpg')
  })

  it('returns null when no employee matches the user email', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })

    const result = await resolveAccountAvatarImage(asPayload(find), 'zeitchef@gmail.com')

    expect(result).toBeNull()
  })

  it('returns null when the image relationship is an unpopulated id', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ image: 7 }] })

    const result = await resolveAccountAvatarImage(asPayload(find), 'someone@ks-schoerke.de')

    expect(result).toBeNull()
  })

  it('returns null when the employee has no image', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{}] })

    const result = await resolveAccountAvatarImage(asPayload(find), 'v.fischer@ks-schoerke.de')

    expect(result).toBeNull()
  })

  it('returns null without querying when email is missing', async () => {
    const find = vi.fn()

    const result = await resolveAccountAvatarImage(asPayload(find), undefined)

    expect(result).toBeNull()
    expect(find).not.toHaveBeenCalled()
  })
})
