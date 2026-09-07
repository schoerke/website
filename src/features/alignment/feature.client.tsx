'use client'

import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { $isDecoratorBlockNode } from '@payloadcms/richtext-lexical/lexical/react/LexicalDecoratorBlockNode'
import { $findMatchingParent } from '@payloadcms/richtext-lexical/lexical/utils'
import {
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  type ElementFormatType,
  type LexicalNode,
} from '@payloadcms/richtext-lexical/lexical'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import type { ToolbarGroup, ToolbarGroupItem } from '@payloadcms/richtext-lexical'
import { AlignCenter, AlignLeft, AlignRight, type LucideProps } from 'lucide-react'
import React from 'react'

function getElementFormat(node: LexicalNode): ElementFormatType | undefined {
  if ($isElementNode(node)) return node.getFormatType()
  if ($isDecoratorBlockNode(node)) return node.__format
  return undefined
}

function createAlignItem(
  format: ElementFormatType,
  key: string,
  labelKey: 'alignLeftLabel' | 'alignCenterLabel' | 'alignRightLabel',
  Icon: React.FC<LucideProps>,
  order: number
): ToolbarGroupItem {
  return {
    ChildComponent: Icon,
    isActive: ({ selection }) => {
      if (!$isRangeSelection(selection)) return false
      for (const node of selection.getNodes()) {
        if (getElementFormat(node) === format) continue
        const parent = node.getParent()
        if (parent && getElementFormat(parent) === format) continue
        return false
      }
      return true
    },
    key,
    label: ({ i18n }) => i18n.t(`lexical:alignment:${labelKey}`),
    onSelect: ({ editor }) => {
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format)
    },
    order,
  }
}

const AlignLeftIcon: React.FC<LucideProps> = () => (
  <AlignLeft aria-hidden={true} className="icon" color="currentColor" focusable={false} size={20} strokeWidth={1.5} />
)

const AlignCenterIcon: React.FC<LucideProps> = () => (
  <AlignCenter aria-hidden={true} className="icon" color="currentColor" focusable={false} size={20} strokeWidth={1.5} />
)

const AlignRightIcon: React.FC<LucideProps> = () => (
  <AlignRight aria-hidden={true} className="icon" color="currentColor" focusable={false} size={20} strokeWidth={1.5} />
)

const alignmentToolbarGroup: ToolbarGroup = {
  ChildComponent: AlignLeftIcon,
  items: [
    createAlignItem('left', 'alignLeft', 'alignLeftLabel', AlignLeftIcon, 1),
    createAlignItem('center', 'alignCenter', 'alignCenterLabel', AlignCenterIcon, 2),
    createAlignItem('right', 'alignRight', 'alignRightLabel', AlignRightIcon, 3),
  ],
  key: 'align',
  order: 30,
  type: 'dropdown',
}

const AlignPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    return editor.registerCommand(
      FORMAT_ELEMENT_COMMAND,
      (format) => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) && !$isNodeSelection(selection)) return false
        const nodes = selection.getNodes()
        for (const node of nodes) {
          const target = $findMatchingParent(
            node,
            (parentNode) => ($isElementNode(parentNode) || $isDecoratorBlockNode(parentNode)) && !parentNode.isInline()
          )
          if (target !== null && ($isElementNode(target) || $isDecoratorBlockNode(target))) {
            target.setFormat(format)
          }
        }
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor])

  return null
}

export const AlignmentFeatureClient = createClientFeature({
  plugins: [{ Component: AlignPlugin, position: 'normal' }],
  toolbarFixed: {
    groups: [alignmentToolbarGroup],
  },
  toolbarInline: {
    groups: [alignmentToolbarGroup],
  },
})
