'use client'

import type { LinkFields } from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { LinkJSXConverter, RichText } from '@payloadcms/richtext-lexical/react'
import React from 'react'

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
      })}
    />
  )
}

export default PayloadRichText
