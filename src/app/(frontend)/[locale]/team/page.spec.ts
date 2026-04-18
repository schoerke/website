import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { redirect } from 'next/navigation'
import TeamPage from './page'

describe('TeamPage redirect', () => {
  it('redirects DE locale to /de/kontakt', async () => {
    await TeamPage({ params: Promise.resolve({ locale: 'de' }) })
    expect(redirect).toHaveBeenCalledWith('/de/kontakt')
  })

  it('redirects EN locale to /en/contact', async () => {
    await TeamPage({ params: Promise.resolve({ locale: 'en' }) })
    expect(redirect).toHaveBeenCalledWith('/en/contact')
  })
})
