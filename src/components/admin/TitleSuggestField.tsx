'use client'

import { TextField, useDocumentInfo, useField, useFormSubmitted, useLocale } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import { useEffect, useMemo, useRef, useState } from 'react'

import { filterTitleSuggestions, type TitleSuggestion } from '@/utils/posts/titleSuggestions'

/**
 * Module-level cache of existing post titles, keyed by locale, for the whole
 * JS context (per tab / per dev session). One slim REST fetch per locale; every
 * keystroke filters in-memory (zero DB queries). Goes stale if another editor
 * adds posts mid-session — accepted trade-off; the save-time block hook is the
 * authoritative safety net.
 */
const titleCache = new Map<string, TitleSuggestion[]>()

const FETCH_URL = (locale: string): string => {
  const params = new URLSearchParams({ limit: '0', depth: '0', sort: 'title', locale })
  params.set('select[title]', 'true')
  params.set('select[categories]', 'true')
  return `/api/posts?${params.toString()}`
}

type TitleSuggestFieldProps = TextFieldClientProps

const TitleSuggestField: React.FC<TitleSuggestFieldProps> = (props) => {
  const { code: locale } = useLocale()
  const { id: documentId } = useDocumentInfo()
  const submitted = useFormSubmitted()
  const { value: fieldValue } = useField<{ value?: unknown }>({ path: props.path })

  const [titles, setTitles] = useState<TitleSuggestion[]>(() => titleCache.get(locale) ?? [])
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const lastSubmittedRef = useRef(submitted)

  const value = typeof fieldValue === 'string' ? fieldValue : ''

  useEffect(() => {
    const requestedLocale = locale
    const cached = titleCache.get(requestedLocale)
    if (cached) {
      setTitles(cached)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    fetch(FETCH_URL(requestedLocale), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as { docs?: TitleSuggestion[] }
      })
      .then((json) => {
        if (cancelled) return
        const docs = json.docs ?? []
        titleCache.set(requestedLocale, docs)
        setTitles(docs)
      })
      .catch((err) => {
        // Unavailable (network, permissions, abort): suggestions silently off for the session.
        if (!cancelled) console.error('Failed to load existing post titles:', err)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [locale])

  const suggestions = useMemo(
    () => filterTitleSuggestions(value, titles, documentId),
    [value, titles, documentId]
  )

  useEffect(() => {
    const wasSubmitted = lastSubmittedRef.current
    if (submitted && !wasSubmitted) {
      const trimmed = value.trim()
      if (trimmed) {
        const current = titleCache.get(locale) ?? []
        if (!current.some((t) => t.id === documentId)) {
          const next = [...current, { id: documentId as number, title: trimmed }]
          titleCache.set(locale, next)
          setTitles(next)
        }
      }
    }
    lastSubmittedRef.current = submitted
  }, [submitted, value, locale, documentId])

  const showDropdown = focused && !dismissed && suggestions.length > 0

  useEffect(() => {
    setDismissed(false)
  }, [value])

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDismissed(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showDropdown])

  return (
    <div
      className="title-suggest"
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      style={{ position: 'relative' }}
    >
      <TextField {...props} />
      {showDropdown && (
        <ul
          aria-label="Bereits verwendete Titel"
          style={{
            backgroundColor: 'var(--theme-elevation-100)',
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: 'var(--style-radius-s)',
            boxShadow: 'var(--style-shadow-m)',
            listStyle: 'none',
            margin: '4px 0 0',
            maxHeight: '240px',
            overflowY: 'auto',
            padding: '4px',
            position: 'absolute',
            width: '100%',
            zIndex: 10,
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s.id}
              style={{ padding: '6px 8px', fontSize: '0.85rem' }}
              title={s.categories && s.categories.length > 0 ? s.categories.join(', ') : undefined}
            >
              <span style={{ color: 'var(--theme-text)' }}>{s.title}</span>
              {s.categories && s.categories.length > 0 && (
                <span style={{ color: 'var(--theme-elevation-500)', marginLeft: '8px' }}>{s.categories.join(', ')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TitleSuggestField