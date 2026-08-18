'use client'

import type { LinkFields } from '@payloadcms/richtext-lexical'
import type { SerializedEditorState, SerializedLexicalNode } from '@payloadcms/richtext-lexical/lexical'

import { LinkJSXConverter, RichText } from '@payloadcms/richtext-lexical/react'
import React from 'react'

import VideoEmbed from '@/components/blocks/VideoEmbed'
import AudioEmbed from '@/components/blocks/AudioEmbed'
import type { VideoEmbedBlockFields } from '@/blocks/VideoEmbed'
import type { AudioEmbedBlockFields } from '@/blocks/AudioEmbed'
import { resolveTextStateStyle } from '@/data/postTextState'

const NODE_STATE_KEY = '$'

function hyphenToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

interface PayloadRichTextProps {
  content: SerializedEditorState
  className?: string
  locale?: string
}

function buildInternalHref(doc: NonNullable<LinkFields['doc']>, locale?: string): string {
  const { relationTo, value } = doc

  // value can be a populated document object or just an ID string/number
  const slug = typeof value === 'object' && value !== null && 'slug' in value ? (value.slug as string) : null

  const localePart = locale ? `/${locale}` : ''

  switch (relationTo) {
    case 'pages':
      return slug ? `${localePart}/${slug}` : '#'
    case 'posts':
      return slug ? `${localePart}/news/${slug}` : '#'
    case 'artists':
      return slug ? `${localePart}/artists/${slug}` : '#'
    case 'projects':
      return slug ? `${localePart}/projects/${slug}` : '#'
    default:
      return slug ? `${localePart}/${slug}` : '#'
  }
}

const PayloadRichText: React.FC<PayloadRichTextProps> = ({ content, className, locale }) => {
  if (!content) return null
  return (
    <RichText
      className={className}
      data={content}
      converters={({ defaultConverters }) => ({
        ...defaultConverters,
        ...LinkJSXConverter({
          internalDocToHref: ({ linkNode }) => {
            const doc = linkNode.fields.doc
            if (!doc) return '#'
            return buildInternalHref(doc, locale)
          },
        }),
        text: (args) => {
          const { node } = args
          let el = typeof defaultConverters.text === 'function' ? defaultConverters.text(args) : node.text

          // Apply TextStateFeature inline styles from the "$" key on serialized text nodes
          const nodeState = (node as Record<string, unknown>)[NODE_STATE_KEY] as Record<string, string> | undefined
          if (nodeState) {
            const styles: React.CSSProperties = {}
            const styleMap = styles as Record<string, string>
            const resolved = resolveTextStateStyle(nodeState)
            for (const [prop, value] of Object.entries(resolved)) {
              styleMap[hyphenToCamel(prop)] = value
            }
            if (Object.keys(styles).length > 0) {
              el = <span style={styles}>{el}</span>
            }
          }

          return el
        },
        blocks: {
          videoEmbed: ({ node }: { node: SerializedLexicalNode & { fields: VideoEmbedBlockFields } }) => {
            const { url, aspectRatio } = node.fields
            return <VideoEmbed url={url} aspectRatio={aspectRatio} locale={locale as 'de' | 'en'} />
          },
          audioEmbed: ({ node }: { node: SerializedLexicalNode & { fields: AudioEmbedBlockFields } }) => {
            const { url, embedCode } = node.fields
            return <AudioEmbed url={url} embedCode={embedCode} />
          },
        },
      })}
    />
  )
}

export default PayloadRichText
