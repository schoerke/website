import { createHeadlessEditor } from '@payloadcms/richtext-lexical/lexical/headless'
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  type LexicalEditor,
  type ParagraphNode,
} from '@payloadcms/richtext-lexical/lexical'
import { describe, expect, it } from 'vitest'

import { splitParagraphsAtLinebreaksLive } from './feature.client'

function createTestEditor(): LexicalEditor {
  const editor = createHeadlessEditor({})
  editor.update(
    () => {
      $getRoot().clear()
    },
    { discrete: true },
  )
  return editor
}

describe('splitParagraphsAtLinebreaksLive', () => {
  it('leaves a paragraph with no linebreak unsplit', () => {
    const editor = createTestEditor()

    editor.update(
      () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('Only text'))
        root.append(paragraph)

        splitParagraphsAtLinebreaksLive(root)
      },
      { discrete: true },
    )

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren()
      expect(children).toHaveLength(1)
      expect(children[0].getTextContent()).toBe('Only text')
    })
  })

  it('splits a paragraph with one linebreak into two sibling paragraphs in order', () => {
    const editor = createTestEditor()

    editor.update(
      () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('First'), $createLineBreakNode(), $createTextNode('Second'))
        root.append(paragraph)

        splitParagraphsAtLinebreaksLive(root)
      },
      { discrete: true },
    )

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren()
      expect(children).toHaveLength(2)
      expect(children[0].getTextContent()).toBe('First')
      expect(children[1].getTextContent()).toBe('Second')
    })
  })

  it('splits a paragraph with three segments into three siblings in order', () => {
    const editor = createTestEditor()

    editor.update(
      () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        paragraph.append(
          $createTextNode('A'),
          $createLineBreakNode(),
          $createTextNode('B'),
          $createLineBreakNode(),
          $createTextNode('C'),
        )
        root.append(paragraph)

        splitParagraphsAtLinebreaksLive(root)
      },
      { discrete: true },
    )

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren()
      expect(children).toHaveLength(3)
      expect(children[0].getTextContent()).toBe('A')
      expect(children[1].getTextContent()).toBe('B')
      expect(children[2].getTextContent()).toBe('C')
    })
  })

  it('copies paragraph-level attributes onto every resulting segment', () => {
    const editor = createTestEditor()

    editor.update(
      () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('First'), $createLineBreakNode(), $createTextNode('Second'))
        paragraph.setFormat('center')
        paragraph.setIndent(2)
        paragraph.setDirection('rtl')
        paragraph.setTextFormat(1)
        paragraph.setTextStyle('color: red;')
        root.append(paragraph)

        splitParagraphsAtLinebreaksLive(root)
      },
      { discrete: true },
    )

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren() as ParagraphNode[]
      expect(children).toHaveLength(2)
      for (const child of children) {
        expect(child.getFormatType()).toBe('center')
        expect(child.getIndent()).toBe(2)
        expect(child.getDirection()).toBe('rtl')
        expect(child.getTextFormat()).toBe(1)
        expect(child.getTextStyle()).toBe('color: red;')
      }
    })
  })

  it('produces an empty leading paragraph when the linebreak comes first', () => {
    const editor = createTestEditor()

    editor.update(
      () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        paragraph.append($createLineBreakNode(), $createTextNode('text'))
        root.append(paragraph)

        splitParagraphsAtLinebreaksLive(root)
      },
      { discrete: true },
    )

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren()
      expect(children).toHaveLength(2)
      const [firstChild] = children
      if (!$isParagraphNode(firstChild)) throw new Error('expected first child to be a paragraph node')
      expect(firstChild.getChildren()).toHaveLength(0)
      expect(children[1].getTextContent()).toBe('text')
    })
  })

  it('produces an empty trailing paragraph when the linebreak comes last', () => {
    const editor = createTestEditor()

    editor.update(
      () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('Only'), $createLineBreakNode())
        root.append(paragraph)

        splitParagraphsAtLinebreaksLive(root)
      },
      { discrete: true },
    )

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren()
      expect(children).toHaveLength(2)
      expect(children[0].getTextContent()).toBe('Only')
      const [, lastChild] = children
      if (!$isParagraphNode(lastChild)) throw new Error('expected last child to be a paragraph node')
      expect(lastChild.getChildren()).toHaveLength(0)
    })
  })

  it('only splits the paragraph with a linebreak, leaving sibling top-level ordering intact', () => {
    const editor = createTestEditor()

    editor.update(
      () => {
        const root = $getRoot()
        const before = $createParagraphNode()
        before.append($createTextNode('Before'))

        const splitting = $createParagraphNode()
        splitting.append($createTextNode('Split1'), $createLineBreakNode(), $createTextNode('Split2'))

        const after = $createParagraphNode()
        after.append($createTextNode('After'))

        root.append(before, splitting, after)

        splitParagraphsAtLinebreaksLive(root)
      },
      { discrete: true },
    )

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren()
      expect(children).toHaveLength(4)
      expect(children[0].getTextContent()).toBe('Before')
      expect(children[1].getTextContent()).toBe('Split1')
      expect(children[2].getTextContent()).toBe('Split2')
      expect(children[3].getTextContent()).toBe('After')
    })
  })
})
