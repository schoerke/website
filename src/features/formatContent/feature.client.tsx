'use client'

import {
  $createParagraphNode,
  $getRoot,
  $isLineBreakNode,
  $isParagraphNode,
  $isTabNode,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalNode,
  type ParagraphNode,
} from '@payloadcms/richtext-lexical/lexical'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { createClientFeature, slashMenuBasicGroupWithItems } from '@payloadcms/richtext-lexical/client'
import { Wand2, type LucideProps } from 'lucide-react'
import React from 'react'

const FORMAT_CONTENT_COMMAND = createCommand<void>('FORMAT_CONTENT_COMMAND')

/**
 * Name of the window event the admin Format button (`FormatDocumentButton`)
 * dispatches to trigger a format from outside the editor. The plugin listens for
 * it and dispatches `FORMAT_CONTENT_COMMAND`, so the transformation runs through
 * the live editor (native, undoable `child.remove()`), keeps the form value in
 * sync via the editor's own onChange, and avoids the remount that would clear
 * the undo stack.
 */
export const FORMAT_CONTENT_EVENT = 'payload:format-content'

const FormatContentIcon: React.FC<LucideProps> = () => (
  <Wand2 aria-hidden={true} className="icon" color="currentColor" focusable={false} size={20} strokeWidth={1.25} />
)

/**
 * Live-node mirror of `isEmptyParagraph` in `formatContent.ts`. A paragraph is
 * empty only when every descendant is a text/linebreak/tab leaf with
 * whitespace-only content. Any other node type keeps the paragraph (Format must
 * never delete non-text content).
 */
function isRemoveableEmptyParagraph(node: LexicalNode): boolean {
  return (
    $isParagraphNode(node) &&
    node.getChildren().every((child) => $isTextNode(child) || $isLineBreakNode(child) || $isTabNode(child)) &&
    node.getTextContent().trim() === ''
  )
}

/**
 * Live-node mirror of `splitParagraphsAtLinebreaks` in `formatContent.ts`. Splits every top-level
 * paragraph containing a direct-child `LineBreakNode` into multiple sibling paragraphs — one per
 * line — discarding the linebreak nodes. Only direct children are inspected; a linebreak nested
 * inside a link or other inline span is left untouched.
 *
 * Mutates `root` directly. Must run to completion before `root.getChildren()` is read again for
 * the empty-paragraph-removal step in `formatDocument`, since that step's "never delete
 * everything" guard depends on the post-split paragraph count.
 */
export function splitParagraphsAtLinebreaksLive(root: ReturnType<typeof $getRoot>): void {
  for (const topLevelChild of root.getChildren()) {
    if (!$isParagraphNode(topLevelChild)) continue

    const children = topLevelChild.getChildren()
    if (!children.some($isLineBreakNode)) continue

    // Start with one segment already present; each linebreak encountered below opens a new one.
    const segments: LexicalNode[][] = [[]]
    for (const child of children) {
      if ($isLineBreakNode(child)) {
        segments.push([])
      } else {
        segments[segments.length - 1].push(child)
      }
    }

    const newParagraphs = segments.map((segmentChildren) => {
      const newParagraph: ParagraphNode = $createParagraphNode()
      newParagraph.setFormat(topLevelChild.getFormatType())
      newParagraph.setIndent(topLevelChild.getIndent())
      newParagraph.setDirection(topLevelChild.getDirection())
      newParagraph.setTextFormat(topLevelChild.getTextFormat())
      newParagraph.setTextStyle(topLevelChild.getTextStyle())
      for (const segmentChild of segmentChildren) {
        newParagraph.append(segmentChild)
      }
      return newParagraph
    })

    // Insert each new paragraph after the previously-inserted one (starting from the original),
    // preserving segment order. Inserting all of them after `topLevelChild` directly would reverse
    // the order.
    let previous: LexicalNode = topLevelChild
    for (const newParagraph of newParagraphs) {
      previous.insertAfter(newParagraph)
      previous = newParagraph
    }

    topLevelChild.remove()
  }
}

const FormatContentPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    const formatDocument = (): boolean => {
      editor.update(() => {
        const root = $getRoot()
        splitParagraphsAtLinebreaksLive(root)
        const children = root.getChildren()
        const toRemove = children.filter(isRemoveableEmptyParagraph)
        // Never reduce the document to zero children (content is required).
        if (toRemove.length === children.length) return
        for (const child of toRemove) child.remove()
      })
      return true
    }

    const handleExternalRequest = (): void => {
      editor.dispatchCommand(FORMAT_CONTENT_COMMAND, undefined)
    }

    const unregisterCommand = editor.registerCommand(FORMAT_CONTENT_COMMAND, formatDocument, COMMAND_PRIORITY_EDITOR)
    window.addEventListener(FORMAT_CONTENT_EVENT, handleExternalRequest)
    return () => {
      unregisterCommand()
      window.removeEventListener(FORMAT_CONTENT_EVENT, handleExternalRequest)
    }
  }, [editor])

  return null
}

export const FormatContentFeatureClient = createClientFeature({
  plugins: [{ Component: FormatContentPlugin, position: 'normal' }],
  slashMenu: {
    groups: [
      slashMenuBasicGroupWithItems([
        {
          Icon: FormatContentIcon,
          key: 'formatContent',
          keywords: ['format', 'clean', 'leer'],
          label: ({ i18n }) => i18n.t('lexical:formatContent:format'),
          onSelect: ({ editor }) => editor.dispatchCommand(FORMAT_CONTENT_COMMAND, undefined),
        },
      ]),
    ],
  },
})
