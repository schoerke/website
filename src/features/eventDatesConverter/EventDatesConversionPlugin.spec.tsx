// @vitest-environment happy-dom
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isTextNode,
  createEditor,
  REDO_COMMAND,
  UNDO_COMMAND,
} from '@payloadcms/richtext-lexical/lexical'
import { $createServerBlockNode, ServerBlockNode } from '@payloadcms/richtext-lexical'
import { createEmptyHistoryState, HistoryPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalHistoryPlugin'
import { LexicalComposer } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposer'
import { EditorRefPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalEditorRefPlugin'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { LucideProps } from 'lucide-react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  editor: undefined as ReturnType<typeof createEditor> | undefined,
  openModal: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  Button: ({
    buttonStyle: _buttonStyle,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { buttonStyle?: string }) => (
    <button {...props}>{children}</button>
  ),
  Drawer: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
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
  $createBlockNode: $createServerBlockNode,
  createClientFeature: <T,>(feature: T) => feature,
  useEditorConfigContext: () => ({ fieldProps: { schemaPath: 'content' } }),
}))

vi.mock('@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [harness.editor],
}))

import { createEventDateSnapshot } from './selection'
import { getEventDateSources } from './selection'
import { EventDatesConversionFeatureClient, replaceEventDateSources } from './feature.client'

afterEach(() => {
  cleanup()
  harness.openModal.mockClear()
})

function createTestEditor() {
  return createEditor({
    namespace: 'eventDatesConversionPlugin',
    nodes: [ServerBlockNode],
    onError: (error) => {
      throw error
    },
  })
}

function selectParagraphs(first: ReturnType<typeof $createTextNode>, last: ReturnType<typeof $createTextNode>): void {
  first.selectStart().setTextNodeRange(first, 0, last, last.getTextContentSize())
}

describe('replaceEventDateSources', () => {
  it('replaces eligible sources with one Payload eventDates block', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createEventDateSnapshot>

    editor.update(() => {
      const first = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
      const second = $createParagraphNode().append($createTextNode('30.5.2026 Vienna'))
      $getRoot().append(first, second)
      const firstText = first.getFirstChildOrThrow()
      const lastText = second.getFirstChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectParagraphs(firstText, lastText)
      snapshot = createEventDateSnapshot(editor, 'content', 'de')
    })

    expect(
      replaceEventDateSources(editor, snapshot!, 'content', 'de', [
        { date: '2026-05-29T12:00:00.000Z', location: 'Salzburg' },
        { date: '2026-05-30T12:00:00.000Z', location: 'Vienna' },
      ])
    ).toBeUndefined()

    editor.read(() => {
      const serialized = editor.getEditorState().toJSON()
      expect(serialized.root.children).toHaveLength(1)
      expect(serialized.root.children[0]).toMatchObject({
        type: 'block',
        version: 2,
        fields: {
          blockType: 'eventDates',
          blockName: '',
          events: [
            { date: '2026-05-29T12:00:00.000Z', location: 'Salzburg' },
            { date: '2026-05-30T12:00:00.000Z', location: 'Vienna' },
          ],
        },
      })
      const fields = (serialized.root.children[0] as unknown as { fields: { id: string } }).fields
      expect(fields.id).toEqual(expect.any(String))
    })
  })

  it('leaves source unchanged when snapshot is stale', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createEventDateSnapshot>

    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
      snapshot = createEventDateSnapshot(editor, 'content', 'de')
      text.setTextContent('30.5.2026 Salzburg')
    })
    const beforeReplacement = editor.getEditorState().toJSON()

    expect(
      replaceEventDateSources(editor, snapshot!, 'content', 'de', [
        { date: '2026-05-29T12:00:00.000Z', location: 'Salzburg' },
      ])
    ).toBe('Auswahl wurde geaendert')
    expect(editor.getEditorState().toJSON()).toEqual(beforeReplacement)
  })

  it('rejects invalid final events before opening an editor transaction', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createEventDateSnapshot>

    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
      snapshot = createEventDateSnapshot(editor, 'content', 'de')
    })
    const beforeReplacement = editor.getEditorState().toJSON()

    expect(replaceEventDateSources(editor, snapshot!, 'content', 'de', [{ date: '', location: 'Salzburg' }])).toBe(
      'Datum muss kanonisches UTC-Mittagsformat verwenden'
    )
    expect(editor.getEditorState().toJSON()).toEqual(beforeReplacement)
  })

  it('rejects an empty final event batch before opening an editor transaction', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createEventDateSnapshot>

    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
      snapshot = createEventDateSnapshot(editor, 'content', 'de')
    })
    const beforeReplacement = editor.getEditorState().toJSON()

    expect(replaceEventDateSources(editor, snapshot!, 'content', 'de', [])).toBe(
      'Mindestens ein Termin ist erforderlich'
    )
    expect(editor.getEditorState().toJSON()).toEqual(beforeReplacement)
  })

  it('returns a localized URL error before opening an editor transaction', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createEventDateSnapshot>

    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
      snapshot = createEventDateSnapshot(editor, 'content', 'de')
    })
    const beforeReplacement = editor.getEditorState().toJSON()

    expect(
      replaceEventDateSources(editor, snapshot!, 'content', 'de', [
        { date: '2026-05-29T12:00:00.000Z', location: 'Salzburg', url: 'javascript:alert(1)' },
      ])
    ).toBe('URL muss eine gueltige HTTP(S)-URL sein')
    expect(editor.getEditorState().toJSON()).toEqual(beforeReplacement)
  })

  it.each([
    ['other', 'de'],
    ['content', 'en'],
  ])('leaves source unchanged when field or locale changes', (schemaPath, locale) => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createEventDateSnapshot>

    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
      snapshot = createEventDateSnapshot(editor, 'content', 'de')
    })
    const beforeReplacement = editor.getEditorState().toJSON()

    expect(
      replaceEventDateSources(editor, snapshot!, schemaPath, locale, [
        { date: '2026-05-29T12:00:00.000Z', location: 'Salzburg' },
      ])
    ).toBe(locale === 'de' ? 'Auswahl wurde geaendert' : 'Selection changed')
    expect(editor.getEditorState().toJSON()).toEqual(beforeReplacement)
  })

  it('undoes and redoes the replacement as one editor update', () => {
    const history = createEmptyHistoryState()
    let editor: ReturnType<typeof createEditor> | undefined
    let snapshot: ReturnType<typeof createEventDateSnapshot>

    render(
      <LexicalComposer
        initialConfig={{
          namespace: 'eventDatesConversionHistory',
          nodes: [ServerBlockNode],
          onError: (error) => {
            throw error
          },
        }}
      >
        <EditorRefPlugin
          editorRef={(nextEditor) => {
            editor = nextEditor ?? undefined
          }}
        />
        <HistoryPlugin externalHistoryState={history} />
      </LexicalComposer>
    )
    expect(editor).toBeDefined()
    act(() => {
      editor!.update(() => {
        const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
        $getRoot().append(paragraph)
        const text = paragraph.getFirstChildOrThrow()
        if (!$isTextNode(text)) throw new Error('Expected text node')
        selectParagraphs(text, text)
        snapshot = createEventDateSnapshot(editor!, 'content', 'de')
      })
    })
    const source = editor!.getEditorState().toJSON()
    act(() =>
      replaceEventDateSources(editor!, snapshot!, 'content', 'de', [
        { date: '2026-05-29T12:00:00.000Z', location: 'Salzburg' },
      ])
    )
    const block = editor!.getEditorState().toJSON()

    act(() => editor!.dispatchCommand(UNDO_COMMAND, undefined))
    expect(editor!.getEditorState().toJSON()).toEqual(source)

    act(() => editor!.dispatchCommand(REDO_COMMAND, undefined))
    expect(editor!.getEditorState().toJSON()).toEqual(block)
  })
})

describe('EventDatesConversionPlugin', () => {
  it('opens drawer from eligible toolbar selection, edits, confirms, and serializes block', async () => {
    const editor = createTestEditor()
    harness.editor = editor
    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
    })
    const feature = EventDatesConversionFeatureClient as unknown as {
      plugins: [{ Component: React.FC }]
      toolbarInline: {
        groups: [
          {
            ChildComponent: React.FC<LucideProps>
            key: string
            type: 'dropdown'
            items: [
              {
                ChildComponent: React.FC<LucideProps>
                isEnabled: (args: { editor: ReturnType<typeof createEditor>; selection: unknown }) => boolean
                label: (args: { i18n: { t: (key: string) => string } }) => string
                onSelect: (args: { editor: ReturnType<typeof createEditor> }) => void
              },
            ]
          },
        ]
      }
    }
    const Plugin = feature.plugins[0].Component
    editor.read(() => expect(getEventDateSources()).toMatchObject({ sources: [{ text: '29.5.2026 Salzburg' }] }))
    expect(feature.toolbarInline.groups[0]).toMatchObject({ key: 'formattingUtilities', type: 'dropdown' })
    const toolbarLabel = feature.toolbarInline.groups[0].items[0].label as (args: {
      i18n: { t: (key: string) => string }
    }) => string
    expect(
      toolbarLabel({
        i18n: { t: (key) => (key === 'lexical:eventDatesConversion:convert' ? 'Convert to EventDates' : key) },
      })
    ).toBe('Convert to EventDates')
    expect(
      toolbarLabel({
        i18n: { t: (key) => (key === 'lexical:eventDatesConversion:convert' ? 'In Termine umwandeln' : key) },
      })
    ).toBe('In Termine umwandeln')
    const GroupIcon = feature.toolbarInline.groups[0].ChildComponent
    const ItemIcon = feature.toolbarInline.groups[0].items[0].ChildComponent
    const { container: groupIcon } = render(<GroupIcon className="toolbar-icon" data-testid="group-icon" />)
    const { container: itemIcon } = render(<ItemIcon className="toolbar-icon" data-testid="item-icon" />)
    const wrenchWrapper = groupIcon.firstElementChild
    const wrench = wrenchWrapper?.firstElementChild
    expect(wrenchWrapper).toHaveClass('icon')
    expect(wrench).toHaveAttribute('width', '16')
    expect(wrench).toHaveAttribute('height', '16')

    const calendar = itemIcon.firstElementChild
    for (const icon of [calendar]) {
      expect(icon).toHaveAttribute('width', '16')
      expect(icon).toHaveAttribute('height', '16')
      expect(icon).toHaveAttribute('stroke-width', '1.5')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
      expect(icon).toHaveAttribute('focusable', 'false')
      expect(icon).toHaveClass('toolbar-icon')
      expect(icon).toHaveClass('icon')
    }
    editor.read(() =>
      expect(feature.toolbarInline.groups[0].items[0].isEnabled({ editor, selection: $getSelection() })).toBe(true)
    )
    render(<Plugin />)
    act(() => feature.toolbarInline.groups[0].items[0].onSelect({ editor }))
    await waitFor(() => expect(harness.openModal).toHaveBeenCalled())
    expect(screen.getByLabelText('Ort 1')).toHaveValue('Salzburg')
    fireEvent.change(screen.getByLabelText('Ort 1'), { target: { value: ' Vienna ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Umwandeln' }))
    await waitFor(() =>
      expect(editor.getEditorState().toJSON().root.children[0]).toMatchObject({
        type: 'block',
        version: 2,
        fields: {
          blockName: '',
          blockType: 'eventDates',
          events: [{ date: '2026-05-29T12:00:00.000Z', location: 'Vienna' }],
        },
      })
    )
  })

  it('leaves editor unchanged when drawer is cancelled', async () => {
    const editor = createTestEditor()
    harness.editor = editor
    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
    })
    const feature = EventDatesConversionFeatureClient as unknown as {
      plugins: [{ Component: React.FC }]
      toolbarInline: {
        groups: [{ items: [{ onSelect: (args: { editor: ReturnType<typeof createEditor> }) => void }] }]
      }
    }
    const Plugin = feature.plugins[0].Component
    editor.read(() => expect(getEventDateSources()).toMatchObject({ sources: [{ text: '29.5.2026 Salzburg' }] }))
    const beforeCancel = editor.getEditorState().toJSON()
    render(<Plugin />)
    act(() => feature.toolbarInline.groups[0].items[0].onSelect({ editor }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(editor.getEditorState().toJSON()).toEqual(beforeCancel)
  })

  it('enables utilities for non-empty ranges and reports an invalid source selection', async () => {
    const editor = createTestEditor()
    harness.editor = editor
    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('not an event date'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      text.select(1, 2)
    })
    const feature = EventDatesConversionFeatureClient as unknown as {
      plugins: [{ Component: React.FC }]
      toolbarInline: {
        groups: [
          {
            items: [
              {
                isEnabled: (args: { editor: ReturnType<typeof createEditor>; selection: unknown }) => boolean
                onSelect: (args: { editor: ReturnType<typeof createEditor> }) => void
              },
            ]
          },
        ]
      }
    }
    const Plugin = feature.plugins[0].Component

    editor.read(() =>
      expect(feature.toolbarInline.groups[0].items[0].isEnabled({ editor, selection: $getSelection() })).toBe(true)
    )
    render(<Plugin />)
    act(() => feature.toolbarInline.groups[0].items[0].onSelect({ editor }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Vollstaendige Absatzinhalte auswaehlen')
    expect(harness.openModal).not.toHaveBeenCalled()
  })

  it('converts unchanged sources after drawer focus clears the editor selection', async () => {
    const editor = createTestEditor()
    harness.editor = editor
    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 Salzburg'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectParagraphs(text, text)
    })
    const feature = EventDatesConversionFeatureClient as unknown as {
      plugins: [{ Component: React.FC }]
      toolbarInline: {
        groups: [{ items: [{ onSelect: (args: { editor: ReturnType<typeof createEditor> }) => void }] }]
      }
    }
    const Plugin = feature.plugins[0].Component
    editor.read(() => expect(getEventDateSources()).toMatchObject({ sources: [{ text: '29.5.2026 Salzburg' }] }))
    render(<Plugin />)
    act(() => feature.toolbarInline.groups[0].items[0].onSelect({ editor }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Umwandeln' })).toBeInTheDocument())

    act(() => editor.update(() => $getRoot().getFirstChildOrThrow().selectStart()))
    fireEvent.click(screen.getByRole('button', { name: 'Umwandeln' }))

    await waitFor(() => expect(editor.getEditorState().toJSON().root.children[0]).toMatchObject({ type: 'block' }))
  })
})
