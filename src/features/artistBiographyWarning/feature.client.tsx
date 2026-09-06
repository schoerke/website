'use client'

import { Banner, useLocale } from '@payloadcms/ui'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import React from 'react'

import {
  type ArtistBiographyValidationError,
  artistBiographyMessages,
  validateArtistBiographyErrors,
} from '@/validators/artistBiography'

import './ArtistBiographyWarningBanner.scss'

const ArtistBiographyWarningPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext()
  const locale = useLocale()?.code === 'de' ? 'de' : 'en'
  const [errors, setErrors] = React.useState<ArtistBiographyValidationError[]>([])

  React.useEffect(() => {
    const field = editor.getRootElement()?.closest('.field-type.rich-text-lexical')
    function validate(value: unknown): void {
      const result = validateArtistBiographyErrors(value)
      field?.classList.toggle('artist-biography-warning', result.length > 0)
      setErrors(result)
    }

    validate(editor.getEditorState().toJSON())
    const unregister = editor.registerUpdateListener(({ editorState }) => validate(editorState.toJSON()))

    return () => {
      unregister()
      field?.classList.remove('artist-biography-warning')
    }
  }, [editor])

  if (errors.length === 0) return null

  return (
    <div role="alert">
      <Banner className="artist-biography-warning-banner" type="error">
        <ul>
          {errors.map((error) => (
            <li key={error}>{artistBiographyMessages[locale][error]}</li>
          ))}
        </ul>
      </Banner>
    </div>
  )
}

export const ArtistBiographyWarningFeatureClient = createClientFeature({
  plugins: [{ Component: ArtistBiographyWarningPlugin, position: 'normal' }],
})
