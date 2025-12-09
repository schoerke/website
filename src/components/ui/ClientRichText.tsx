'use client'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import PayloadRichText from './PayloadRichText'

export default function ClientRichText({ content }: { content: SerializedEditorState }) {
  return <PayloadRichText content={content} />
}
