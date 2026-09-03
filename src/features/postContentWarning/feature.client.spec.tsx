// @vitest-environment happy-dom
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  editor: undefined as
    | {
        getEditorState: () => { toJSON: () => unknown }
        getRootElement: () => HTMLElement
        registerUpdateListener: (listener: (args: { editorState: { toJSON: () => unknown } }) => void) => () => void
      }
    | undefined,
  listener: undefined as ((args: { editorState: { toJSON: () => unknown } }) => void) | undefined,
  locale: 'de',
  root: document.createElement('div'),
}))

vi.mock('@payloadcms/ui', () => ({
  Banner: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  useLocale: () => ({ code: harness.locale }),
}))

vi.mock('@payloadcms/richtext-lexical/client', () => ({
  createClientFeature: <T,>(feature: T) => feature,
}))

vi.mock('@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [harness.editor],
}))

import { PostContentWarningFeatureClient } from './feature.client'

const invalidContent = {
  root: { children: [{ type: 'block' }, { type: 'paragraph', children: [] }] },
}
const validContent = { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Text' }] }] } }

afterEach(() => {
  harness.editor = undefined
  harness.locale = 'de'
  harness.listener = undefined
  harness.root = document.createElement('div')
})

describe('PostContentWarningFeatureClient', () => {
  it('shows a localized warning list and toggles field class from editor updates', async () => {
    const field = document.createElement('div')
    field.className = 'field-type rich-text-lexical'
    field.append(harness.root)
    document.body.append(field)
    harness.editor = {
      getEditorState: () => ({ toJSON: () => invalidContent }),
      getRootElement: () => harness.root,
      registerUpdateListener: (listener) => {
        harness.listener = listener
        return () => {
          harness.listener = undefined
        }
      },
    }
    const feature = PostContentWarningFeatureClient as unknown as { plugins: [{ Component: React.FC }] }
    const Plugin = feature.plugins[0].Component
    const view = render(<Plugin />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Der Beitrag muss mit Text beginnen, nicht mit einem Einbettungsblock.')
    expect(alert).toHaveTextContent('Leere Zeilen am Ende entfernen.')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(field).toHaveClass('post-content-warning')

    act(() => harness.listener?.({ editorState: { toJSON: () => validContent } }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(field).not.toHaveClass('post-content-warning')

    view.unmount()
    expect(field).not.toHaveClass('post-content-warning')
  })
})
