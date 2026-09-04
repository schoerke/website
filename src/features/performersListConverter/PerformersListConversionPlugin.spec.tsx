// @vitest-environment happy-dom
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  createEditor,
  REDO_COMMAND,
  UNDO_COMMAND,
} from '@payloadcms/richtext-lexical/lexical'
import { $createServerBlockNode, ServerBlockNode } from '@payloadcms/richtext-lexical'
import { createEmptyHistoryState, HistoryPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalHistoryPlugin'
import { LexicalComposer } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposer'
import { EditorRefPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalEditorRefPlugin'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  createBlockNode: undefined as unknown as typeof $createServerBlockNode,
  editor: undefined as ReturnType<typeof createEditor> | undefined,
  openModal: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  Button: ({
    buttonStyle: _buttonStyle,
    children,
    round: _round,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { buttonStyle?: string; round?: boolean }) => (
    <button {...props}>{children}</button>
  ),
  Drawer: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  MoreIcon: () => <span>More</span>,
  Popup: ({
    button,
    render,
  }: {
    button: React.ReactNode
    render: (args: { close: () => void }) => React.ReactNode
  }) => (
    <div>
      {button}
      {render({ close: vi.fn() })}
    </div>
  ),
  PopupList: {
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
    ButtonGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
  TextInput: ({
    Error: _error,
    label,
    showError: _showError,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    Error?: React.ReactNode
    label: string
    showError?: boolean
  }) => (
    <label>
      {label}
      <input {...props} />
    </label>
  ),
  useLocale: () => ({ code: 'de' }),
  useModal: () => ({ closeModal: vi.fn(), modalState: {}, openModal: harness.openModal }),
}))

vi.mock('@payloadcms/richtext-lexical/client', () => ({
  $createBlockNode: (...args: Parameters<typeof $createServerBlockNode>) => harness.createBlockNode(...args),
  createClientFeature: <T,>(feature: T) => feature,
  useEditorConfigContext: () => ({ fieldProps: { schemaPath: 'content' } }),
}))

vi.mock('@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [harness.editor],
}))

import { toConvertedItems } from './draft'
import { PerformersListConversionFeatureClient, replacePerformersListSources } from './feature.client'
import { createPerformersListSnapshot, getPerformersListSources } from './selection'

afterEach(() => {
  document.body.replaceChildren()
  harness.openModal.mockClear()
})

beforeEach(() => {
  harness.createBlockNode = $createServerBlockNode
})

function createTestEditor() {
  return createEditor({
    namespace: 'performersListConversionPlugin',
    nodes: [ServerBlockNode],
    onError: (error) => {
      throw error
    },
  })
}

function selectParagraphs(first: ReturnType<typeof $createTextNode>, last: ReturnType<typeof $createTextNode>): void {
  first.selectStart().setTextNodeRange(first, 0, last, last.getTextContentSize())
}

describe('replacePerformersListSources', () => {
  it('creates one exact performersList block from selected source paragraphs', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createPerformersListSnapshot>

    editor.update(() => {
      const solo = $createParagraphNode().append($createTextNode('Tianwa Yang | Violine'))
      const group = $createParagraphNode().append($createTextNode('Trio Catch'))
      const member = $createParagraphNode().append($createTextNode('Martin Adámek | Klarinette'))
      $getRoot().append(solo, group, member)
      const first = solo.getFirstChildOrThrow()
      const last = member.getFirstChildOrThrow()
      if (!$isTextNode(first) || !$isTextNode(last)) throw new Error('Expected text nodes')
      selectParagraphs(first, last)
      snapshot = createPerformersListSnapshot(editor, 'content', 'de')
    })
    const result = toConvertedItems([
      { sourceId: 'solo:0', originalText: '', type: 'performer', name: 'Tianwa Yang', instrument: 'Violine' },
      {
        sourceId: 'group:0',
        originalText: '',
        type: 'ensembleGroup',
        groupName: 'Trio Catch',
        members: [
          {
            sourceId: 'member:0',
            originalText: '',
            type: 'performer',
            name: 'Martin Adámek',
            instrument: 'Klarinette',
          },
        ],
      },
    ])
    if (!result.ok) throw new Error(result.reasons.join(', '))

    expect(replacePerformersListSources(editor, snapshot!, 'content', 'de', result.items)).toBeUndefined()
    editor.read(() => {
      const serialized = editor.getEditorState().toJSON()
      expect(serialized.root.children).toEqual([
        {
          type: 'block',
          version: 2,
          format: '',
          fields: {
            id: expect.any(String),
            blockType: 'performersList',
            blockName: '',
            items: [
              { blockType: 'performer', name: 'Tianwa Yang', instrument: 'Violine' },
              {
                blockType: 'ensembleGroup',
                groupName: 'Trio Catch',
                members: [{ name: 'Martin Adámek', instrument: 'Klarinette' }],
              },
            ],
          },
        },
      ])
    })
  })

  it('aborts stale sources without modifying content', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createPerformersListSnapshot>
    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang | Violine'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
      snapshot = createPerformersListSnapshot(editor, 'content', 'de')
      text.setTextContent('Changed')
    })
    const before = editor.getEditorState().toJSON()

    expect(
      replacePerformersListSources(editor, snapshot!, 'content', 'de', [
        { blockType: 'performer', name: 'Tianwa Yang', instrument: 'Violine' },
      ])
    ).toBe('Auswahl wurde geaendert')
    expect(editor.getEditorState().toJSON()).toEqual(before)
  })

  it('preserves sources and returns actionable feedback when block creation fails', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createPerformersListSnapshot>
    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang | Violine'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
      snapshot = createPerformersListSnapshot(editor, 'content', 'de')
    })
    const before = editor.getEditorState().toJSON()
    harness.createBlockNode = () => {
      throw new Error('factory failed')
    }

    expect(
      replacePerformersListSources(editor, snapshot!, 'content', 'de', [
        { blockType: 'performer', name: 'Tianwa Yang' },
      ])
    ).toBe('Umwandlung fehlgeschlagen. Bitte erneut versuchen.')
    expect(editor.getEditorState().toJSON()).toEqual(before)
  })

  it('shows conversion failure feedback after drawer confirmation', async () => {
    const editor = createTestEditor()
    harness.editor = editor
    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang | Violine'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
    })
    harness.createBlockNode = () => {
      throw new Error('factory failed')
    }
    const feature = PerformersListConversionFeatureClient as unknown as {
      plugins: [{ Component: React.FC }]
      toolbarInline: {
        groups: [{ items: [{ onSelect: (args: { editor: ReturnType<typeof createEditor> }) => void }] }]
      }
    }
    const Plugin = feature.plugins[0].Component
    render(<Plugin />)
    act(() => {
      editor.update(() => {
        const paragraph = $getRoot().getFirstChildOrThrow()
        if (!$isElementNode(paragraph)) throw new Error('Expected paragraph node')
        const text = paragraph.getFirstChildOrThrow()
        if (!$isTextNode(text)) throw new Error('Expected text node')
        selectParagraphs(text, text)
      })
    })
    editor.read(() =>
      expect(getPerformersListSources()).toMatchObject({ sources: [{ text: 'Tianwa Yang | Violine' }] })
    )
    act(() => feature.toolbarInline.groups[0].items[0].onSelect({ editor }))
    await waitFor(() => expect(harness.openModal).toHaveBeenCalled())
    act(() => {
      screen.getByRole('button', { name: 'Convert' }).click()
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Umwandlung fehlgeschlagen. Bitte erneut versuchen.')
  })

  it('replaces all Shift+Enter lines by removing their one shared source paragraph', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createPerformersListSnapshot>
    editor.update(() => {
      const paragraph = $createParagraphNode().append(
        $createTextNode('Tianwa Yang | Violine'),
        $createLineBreakNode(),
        $createTextNode('Trio Catch'),
        $createLineBreakNode(),
        $createTextNode('Martin Adámek | Klarinette')
      )
      $getRoot().append(paragraph)
      const first = paragraph.getFirstChildOrThrow()
      const last = paragraph.getLastChildOrThrow()
      if (!$isTextNode(first) || !$isTextNode(last)) throw new Error('Expected text nodes')
      selectParagraphs(first, last)
      snapshot = createPerformersListSnapshot(editor, 'content', 'de')
    })

    expect(
      replacePerformersListSources(editor, snapshot!, 'content', 'de', [
        { blockType: 'performer', name: 'Tianwa Yang', instrument: 'Violine' },
      ])
    ).toBeUndefined()
    editor.read(() => {
      const serialized = editor.getEditorState().toJSON()
      expect(serialized.root.children).toHaveLength(1)
      expect(serialized.root.children[0]).toMatchObject({ type: 'block' })
    })
  })

  it('undoes and redoes conversion in one editor update', () => {
    const history = createEmptyHistoryState()
    let editor: ReturnType<typeof createEditor> | undefined
    let snapshot: ReturnType<typeof createPerformersListSnapshot>
    render(
      <LexicalComposer
        initialConfig={{
          namespace: 'performersListHistory',
          nodes: [ServerBlockNode],
          onError: (error) => {
            throw error
          },
        }}
      >
        <EditorRefPlugin
          editorRef={(next) => {
            editor = next ?? undefined
          }}
        />
        <HistoryPlugin externalHistoryState={history} />
      </LexicalComposer>
    )
    act(() =>
      editor!.update(() => {
        const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang | Violine'))
        $getRoot().append(paragraph)
        const text = paragraph.getFirstChildOrThrow()
        if (!$isTextNode(text)) throw new Error('Expected text node')
        selectParagraphs(text, text)
        snapshot = createPerformersListSnapshot(editor!, 'content', 'de')
      })
    )
    const source = editor!.getEditorState().toJSON()
    act(() =>
      replacePerformersListSources(editor!, snapshot!, 'content', 'de', [
        { blockType: 'performer', name: 'Tianwa Yang' },
      ])
    )
    const block = editor!.getEditorState().toJSON()

    act(() => editor!.dispatchCommand(UNDO_COMMAND, undefined))
    expect(editor!.getEditorState().toJSON()).toEqual(source)
    act(() => editor!.dispatchCommand(REDO_COMMAND, undefined))
    expect(editor!.getEditorState().toJSON()).toEqual(block)
  })
})
