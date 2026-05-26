import { createMockEmployee, createMockPaginatedDocs } from '@/tests/utils/payloadMocks'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getContactPageData } from './contactPageData'

vi.mock('@/services/employee', () => ({ getEmployees: vi.fn() }))
vi.mock('@/services/media.server', () => ({ getImageByFilename: vi.fn() }))
vi.mock('@/services/page', () => ({ getPageBySlug: vi.fn() }))
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockImplementation(() => (key: string) => key),
}))

import { getEmployees } from '@/services/employee'
import { getImageByFilename } from '@/services/media.server'
import { getPageBySlug } from '@/services/page'

const mockPage = (title: string, slug: string) => ({
  id: 1,
  title,
  slug,
  content: null,
  updatedAt: '',
  createdAt: '',
})

const mockImage = { id: 1, url: '/wiesbaden.webp', alt: 'Wiesbaden', updatedAt: '', createdAt: '' }

describe('getContactPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPageBySlug).mockImplementation(async (slug) => {
      if (slug === 'team') return mockPage('Team', 'team') as never
      return null as never
    })
    vi.mocked(getEmployees).mockResolvedValue(
      createMockPaginatedDocs([createMockEmployee(), createMockEmployee({ id: 2, name: 'Jane Smith' })]) as never
    )
    vi.mocked(getImageByFilename).mockResolvedValue(mockImage as never)
  })

  it('fetches team page, employees and image in parallel', async () => {
    await getContactPageData('en')

    expect(getPageBySlug).toHaveBeenCalledWith('team', 'en')
    expect(getEmployees).toHaveBeenCalledWith('en')
    expect(getImageByFilename).toHaveBeenCalledWith('wiesbaden.webp')
  })

  it('does not fetch contact page from CMS', async () => {
    await getContactPageData('en')

    expect(getPageBySlug).toHaveBeenCalledTimes(1)
    expect(getPageBySlug).toHaveBeenCalledWith('team', 'en')
  })

  it('returns teamPage, employees, image and labels', async () => {
    const result = await getContactPageData('en')

    expect(result.teamPage?.title).toBe('Team')
    expect(result.employees).toHaveLength(2)
    expect(result.wiesbadenImage?.url).toBe('/wiesbaden.webp')
    expect(result.phoneLabel).toBe('phone')
    expect(result.mobileLabel).toBe('mobile')
  })

  it('returns empty employees array when none exist', async () => {
    vi.mocked(getEmployees).mockResolvedValue(createMockPaginatedDocs([]) as never)
    const result = await getContactPageData('en')
    expect(result.employees).toHaveLength(0)
  })
})
