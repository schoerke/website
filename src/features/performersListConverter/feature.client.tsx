'use client'

import { useLocale, useModal } from '@payloadcms/ui'
import { $createBlockNode, createClientFeature, useEditorConfigContext } from '@payloadcms/richtext-lexical/client'
import {
  $getNodeByKey,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalEditor,
} from '@payloadcms/richtext-lexical/lexical'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { ListTree, type LucideProps, Wrench } from 'lucide-react'
import React from 'react'

import { toConvertedItems, type ConvertedItem, type DraftItem } from './draft'
import PerformersListConversionDrawer from './PerformersListConversionDrawer'
import {
  createPerformersListSnapshot,
  getPerformersListSources,
  matchesPerformersListSnapshot,
  type PerformersListSnapshot,
} from './selection'

const performersListConversionDrawerSlug = 'performers-list-conversion'
const OPEN_PERFORMERS_LIST_CONVERSION_COMMAND = createCommand<void>('OPEN_PERFORMERS_LIST_CONVERSION_COMMAND')

const messages = {
  de: {
    conversionLabel: 'Convert to PerformersList',
    conversionFailed: 'Umwandlung fehlgeschlagen. Bitte erneut versuchen.',
    selectionChanged: 'Auswahl wurde geaendert',
    selectionComplete: 'Vollstaendige Absatzinhalte auswaehlen',
  },
  en: {
    conversionLabel: 'Convert to PerformersList',
    conversionFailed: 'Conversion failed. Please try again.',
    selectionChanged: 'Selection changed',
    selectionComplete: 'Select complete paragraph contents',
  },
} as const

type Messages = Record<keyof (typeof messages)['en'], string>

function getMessages(locale: string): Messages {
  return locale === 'de' ? messages.de : messages.en
}

function localizeSelectionError(error: string, locale: string): string {
  return error === 'Select complete paragraph contents' ? getMessages(locale).selectionComplete : error
}

function hasRangeSelection(selection: unknown): boolean {
  return $isRangeSelection(selection) && !selection.isCollapsed()
}

function validateConvertedItems(items: ConvertedItem[]): ConvertedItem[] | undefined {
  const draft: DraftItem[] = items.map((item, index) => {
    const sourceId = `final:${index}`
    if (item.blockType === 'performer') {
      return { ...item, originalText: '', sourceId, type: 'performer' }
    }
    return {
      ...item,
      members: item.members.map((member, memberIndex) => ({
        ...member,
        originalText: '',
        sourceId: `${sourceId}:${memberIndex}`,
        type: 'performer',
      })),
      originalText: '',
      sourceId,
      type: 'ensembleGroup',
    }
  })
  const result = toConvertedItems(draft)
  return result.ok ? result.items : undefined
}

const PerformersListConversionGroupIcon: React.FC<LucideProps> = (props) => (
  <span className={['icon', props.className].filter(Boolean).join(' ')}>
    <Wrench aria-hidden={true} color="currentColor" focusable={false} size={16} strokeWidth={1.5} />
  </span>
)

const PerformersListConversionItemIcon: React.FC<LucideProps> = (props) => (
  <ListTree
    {...props}
    aria-hidden={true}
    className={['icon', props.className].filter(Boolean).join(' ')}
    color="currentColor"
    focusable={false}
    size={16}
    strokeWidth={1.5}
  />
)

export function replacePerformersListSources(
  editor: LexicalEditor,
  snapshot: PerformersListSnapshot,
  schemaPath: string,
  locale: string,
  items: ConvertedItem[]
): string | undefined {
  const convertedItems = validateConvertedItems(items)
  if (!convertedItems) return 'At least one item is required'
  let error: string | undefined

  try {
    editor.update(() => {
      if (!matchesPerformersListSnapshot(snapshot, editor, schemaPath, locale)) {
        error = getMessages(locale).selectionChanged
        return
      }

      const sourceNodes = [...new Set(snapshot.sources.map((source) => source.key))].map((key) => $getNodeByKey(key))
      const firstSource = sourceNodes[0]
      if (!firstSource || sourceNodes.some((node) => !node)) {
        error = getMessages(locale).selectionChanged
        return
      }

      firstSource.insertBefore($createBlockNode({ blockName: '', blockType: 'performersList', items: convertedItems }))
      for (const sourceNode of sourceNodes) sourceNode?.remove()
    })
  } catch {
    error = getMessages(locale).conversionFailed
  }

  return error
}

const PerformersListConversionPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext()
  const { fieldProps } = useEditorConfigContext()
  const locale = useLocale()?.code ?? 'en'
  const { openModal } = useModal()
  const [snapshot, setSnapshot] = React.useState<PerformersListSnapshot>()
  const [error, setError] = React.useState<string>()

  React.useEffect(() => {
    return editor.registerCommand(
      OPEN_PERFORMERS_LIST_CONVERSION_COMMAND,
      () => {
        const { nextSnapshot, selectionError } = editor.getEditorState().read(() => {
          const result = getPerformersListSources()
          return {
            nextSnapshot:
              'sources' in result ? createPerformersListSnapshot(editor, fieldProps.schemaPath, locale) : undefined,
            selectionError: 'error' in result ? result.error : undefined,
          }
        })
        if (selectionError) {
          setError(localizeSelectionError(selectionError, locale))
          return true
        }
        if (!nextSnapshot) return true
        setError(undefined)
        setSnapshot(nextSnapshot)
        openModal(performersListConversionDrawerSlug)
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor, fieldProps.schemaPath, locale, openModal])

  if (!snapshot) return error ? <p role="alert">{error}</p> : null

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <PerformersListConversionDrawer
        onCancel={() => setSnapshot(undefined)}
        onConfirm={(items) => {
          const replacementError = replacePerformersListSources(editor, snapshot, fieldProps.schemaPath, locale, items)
          setSnapshot(undefined)
          setError(replacementError)
        }}
        slug={performersListConversionDrawerSlug}
        sources={snapshot.sources}
      />
    </>
  )
}

export const PerformersListConversionFeatureClient = createClientFeature({
  plugins: [{ Component: PerformersListConversionPlugin, position: 'normal' }],
  toolbarInline: {
    groups: [
      {
        ChildComponent: PerformersListConversionGroupIcon,
        items: [
          {
            ChildComponent: PerformersListConversionItemIcon,
            isActive: () => false,
            isEnabled: ({ selection }) => hasRangeSelection(selection),
            key: 'performersListConversion',
            label: ({ i18n }) => i18n.t('lexical:performersListConversion:convert'),
            onSelect: ({ editor }) => editor.dispatchCommand(OPEN_PERFORMERS_LIST_CONVERSION_COMMAND, undefined),
          },
        ],
        key: 'formattingUtilities',
        type: 'dropdown',
      },
    ],
  },
})
