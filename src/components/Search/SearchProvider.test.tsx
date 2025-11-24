/**
 * Minimal KBar test to verify basic functionality
 */

'use client'

import { KBarAnimator, KBarPortal, KBarPositioner, KBarProvider, KBarResults, KBarSearch, useMatches } from 'kbar'
import { ReactNode } from 'react'

interface MinimalSearchProviderProps {
  children: ReactNode
}

export const MinimalSearchProvider: React.FC<MinimalSearchProviderProps> = ({ children }) => {
  const actions = [
    {
      id: 'test1',
      name: 'Test Action 1',
      perform: () => console.log('Test 1 clicked'),
    },
    {
      id: 'test2',
      name: 'Test Action 2',
      perform: () => console.log('Test 2 clicked'),
    },
  ]

  console.log('MinimalSearchProvider: initializing with', actions.length, 'actions')

  return (
    <KBarProvider actions={actions}>
      <KBarPortal>
        <KBarPositioner style={{ zIndex: 9999 }}>
          <KBarAnimator style={{ maxWidth: '600px', width: '100%' }}>
            <KBarSearch style={{ padding: '12px', width: '100%', boxSizing: 'border-box' }} />
            <MinimalResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  )
}

function MinimalResults() {
  const { results } = useMatches()
  console.log('MinimalResults: rendering, results count:', results.length, results)

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => (
        <div style={{ padding: '12px', background: active ? '#eee' : 'white' }}>
          {typeof item === 'string' ? `Section: ${item}` : item.name}
        </div>
      )}
    />
  )
}
