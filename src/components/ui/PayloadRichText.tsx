'use client'

/* oxlint-disable no-img-element -- mirrors the default UploadJSXConverter markup */

import type { LinkFields } from '@payloadcms/richtext-lexical'
import type { SerializedEditorState, SerializedLexicalNode } from '@payloadcms/richtext-lexical/lexical'

import { LinkJSXConverter, RichText } from '@payloadcms/richtext-lexical/react'
import React from 'react'

import VideoEmbed from '@/components/blocks/VideoEmbed'
import AudioEmbed from '@/components/blocks/AudioEmbed'
import type { VideoEmbedBlockFields } from '@/blocks/VideoEmbed'
import type { AudioEmbedBlockFields } from '@/blocks/AudioEmbed'
import { resolveTextStateStyle } from '@/data/postTextState'
import { appendImageVersion } from '@/utils/image'

const NODE_STATE_KEY = '$'

interface VersionedUploadDoc {
  url?: string | null
  updatedAt?: string | null
  filename?: string | null
  mimeType?: string | null
  width?: number | null
  height?: number | null
  alt?: string | null
  sizes?: Record<
    string,
    {
      url?: string | null
      width?: number | null
      height?: number | null
      mimeType?: string | null
      filesize?: number | null
      filename?: string | null
    } | null
  >
}

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

interface VersionedUploadNodeArgs {
  node: SerializedLexicalNode & { value?: unknown; fields?: { alt?: string } }
}

/**
 * Lexical upload-node JSX converter that mirrors the default UploadJSXConverter
 * but appends the cache-busting `?v=updatedAt` param to every image URL. Kept as
 * a standalone export so the versioning behavior is unit-testable.
 */
export function versionedUploadJSXConverter({ node }: VersionedUploadNodeArgs): React.ReactNode {
  const uploadDoc = typeof node.value === 'object' && node.value !== null ? (node.value as VersionedUploadDoc) : null
  if (!uploadDoc) return null

  const alt = node.fields?.alt || uploadDoc.alt || ''
  // Non-image uploads render as a link, no cache-busting needed
  if (!uploadDoc.mimeType?.startsWith('image')) {
    return (
      <a href={uploadDoc.url ?? ''} rel="noopener noreferrer">
        {uploadDoc.filename}
      </a>
    )
  }

  const url = appendImageVersion(uploadDoc.url ?? '', uploadDoc)
  const hasSizes = uploadDoc.sizes && Object.keys(uploadDoc.sizes).length > 0

  if (!hasSizes) {
    return <img alt={alt} height={uploadDoc.height ?? undefined} src={url} width={uploadDoc.width ?? undefined} />
  }

  // Mirror the default UploadJSXConverter <picture> markup with versioned URLs
  const pictureJSX = []
  for (const size in uploadDoc.sizes) {
    const imageSize = uploadDoc.sizes[size]
    if (
      !imageSize ||
      !imageSize.width ||
      !imageSize.height ||
      !imageSize.mimeType ||
      !imageSize.filesize ||
      !imageSize.filename ||
      !imageSize.url
    ) {
      continue
    }
    pictureJSX.push(
      <source
        key={size}
        media={`(max-width: ${imageSize.width}px)`}
        srcSet={appendImageVersion(imageSize.url, uploadDoc)}
        type={imageSize.mimeType}
      />
    )
  }
  pictureJSX.push(
    <img key="image" alt={alt} height={uploadDoc.height ?? undefined} src={url} width={uploadDoc.width ?? undefined} />
  )
  return <picture>{pictureJSX}</picture>
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
        upload: (args) => versionedUploadJSXConverter(args),
      })}
    />
  )
}

export default PayloadRichText
