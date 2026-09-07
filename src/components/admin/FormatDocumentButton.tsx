'use client'

import { useLocale } from '@payloadcms/ui'
import { Wand2, type LucideProps } from 'lucide-react'
import { useCallback } from 'react'

import { FORMAT_CONTENT_EVENT } from '@/features/formatContent/feature.client'

const WandIcon: React.FC<LucideProps> = () => (
  <Wand2
    aria-hidden={true}
    className="icon"
    color="currentColor"
    focusable={false}
    strokeWidth={1.25}
    style={{ height: 'var(--base)', width: 'var(--base)' }}
  />
)

const FormatDocumentButton: React.FC = () => {
  const { code: locale } = useLocale()
  const label = locale === 'de' ? 'Formatieren' : 'Format'

  const handleClick = useCallback(() => {
    // The editor's FormatContent plugin listens for this event and runs the
    // transform through the live editor (undoable, keeps form value in sync).
    window.dispatchEvent(new CustomEvent(FORMAT_CONTENT_EVENT))
  }, [])

  return (
    <button
      aria-label={label}
      className="preview-btn"
      onClick={handleClick}
      style={{ height: 'calc(var(--base) * 1.6)', width: 'calc(var(--base) * 1.6)' }}
      title={label}
      type="button"
    >
      <WandIcon />
    </button>
  )
}

export default FormatDocumentButton
