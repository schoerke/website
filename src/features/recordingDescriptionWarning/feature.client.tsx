'use client'

import { Banner, useLocale } from '@payloadcms/ui'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import React from 'react'

import {
  type RecordingDescriptionValidationError,
  recordingDescriptionMessages,
  validateRecordingDescriptionErrors,
} from '@/validators/recordingDescription'

import './RecordingDescriptionWarningBanner.scss'

const RecordingDescriptionWarningPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext()
  const locale = useLocale()?.code === 'de' ? 'de' : 'en'
  const [errors, setErrors] = React.useState<RecordingDescriptionValidationError[]>([])

  React.useEffect(() => {
    const field = editor.getRootElement()?.closest('.field-type.rich-text-lexical')
    function validate(value: unknown): void {
      const result = validateRecordingDescriptionErrors(value)
      field?.classList.toggle('recording-description-warning', result.length > 0)
      setErrors(result)
    }

    validate(editor.getEditorState().toJSON())
    const unregister = editor.registerUpdateListener(({ editorState }) => validate(editorState.toJSON()))

    return () => {
      unregister()
      field?.classList.remove('recording-description-warning')
    }
  }, [editor])

  if (errors.length === 0) return null

  return (
    <div role="alert">
      <Banner className="recording-description-warning-banner" type="error">
        <ul>
          {errors.map((error) => (
            <li key={error}>{recordingDescriptionMessages[locale][error]}</li>
          ))}
        </ul>
      </Banner>
    </div>
  )
}

export const RecordingDescriptionWarningFeatureClient = createClientFeature({
  plugins: [{ Component: RecordingDescriptionWarningPlugin, position: 'normal' }],
})