// @vitest-environment happy-dom

import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SearchProvider from './SearchProvider'

const registeredActions = vi.fn()
const routerPush = vi.fn()

vi.mock('@/actions/employees', () => ({
  fetchEmployees: vi.fn().mockResolvedValue({ docs: [] }),
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: vi.fn(() => ({ push: routerPush })),
}))

vi.mock('@/services/search', () => ({
  searchContent: vi.fn().mockResolvedValue({
    results: {
      artists: [
        {
          id: 'artist-1',
          title: 'Jane Artist',
          relationTo: 'artists',
          relationId: 'jane-artist',
          slug: 'jane-artist',
          priority: 0,
        },
      ],
      employees: [],
      repertoire: [],
    },
  }),
}))

vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
}))

vi.mock('kbar', async () => {
  const query = { inputRefSetter: vi.fn(), setSearch: vi.fn() }
  const state = { query, searchQuery: 'Jane', visualState: 'showing' }
  return {
    KBarAnimator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    KBarPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    KBarPositioner: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    KBarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    KBarResults: () => null,
    useKBar: (selector: (value: typeof state) => unknown) => selector(state),
    useMatches: () => ({ results: [] }),
    useRegisterActions: (actions: unknown[]) => registeredActions(actions),
  }
})

describe('SearchProvider', () => {
  it('navigates artist search actions to the biography hash', async () => {
    render(
      <SearchProvider>
        <div>Content</div>
      </SearchProvider>
    )

    await waitFor(() => {
      const action = registeredActions.mock.calls
        .flatMap(([actions]) => actions as Array<{ id: string; perform: () => void }>)
        .find((candidate) => candidate.id === 'search-artist-1')
      expect(action).toBeDefined()
      action?.perform()
    })

    expect(routerPush).toHaveBeenCalledWith('/artists/jane-artist#biography')
  })
})
