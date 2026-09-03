'use client'

import { Banner, useLocale } from '@payloadcms/ui'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import React from 'react'

import {
  type PostContentValidationError,
  postContentMessages,
  validatePostContentErrors,
} from '@/validators/postContent'

import './PostContentWarningBanner.scss'

const PostContentWarningPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext()
  const locale = useLocale()?.code === 'de' ? 'de' : 'en'
  const [errors, setErrors] = React.useState<PostContentValidationError[]>([])

  React.useEffect(() => {
    const field = editor.getRootElement()?.closest('.field-type.rich-text-lexical')
    function validate(value: unknown): void {
      const result = validatePostContentErrors(value)
      field?.classList.toggle('post-content-warning', result.length > 0)
      setErrors(result)
    }

    validate(editor.getEditorState().toJSON())
    const unregister = editor.registerUpdateListener(({ editorState }) => validate(editorState.toJSON()))

    return () => {
      unregister()
      field?.classList.remove('post-content-warning')
    }
  }, [editor])

  if (errors.length === 0) return null

  return (
    <div role="alert">
      <Banner className="post-content-warning-banner" type="error">
        <ul>
          {errors.map((error) => (
            <li key={error}>{postContentMessages[locale][error]}</li>
          ))}
        </ul>
      </Banner>
    </div>
  )
}

export const PostContentWarningFeatureClient = createClientFeature({
  plugins: [{ Component: PostContentWarningPlugin, position: 'normal' }],
})
