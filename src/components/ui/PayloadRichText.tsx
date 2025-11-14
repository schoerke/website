'use client'
import { RichText } from '@payloadcms/richtext-lexical/react'
import React from 'react'

interface PayloadRichTextProps {
  content: any
  className?: string
}

const PayloadRichText: React.FC<PayloadRichTextProps> = ({ content, className }) => {
  if (!content) return null
  return <RichText className={className} data={content} />
}

export default PayloadRichText
