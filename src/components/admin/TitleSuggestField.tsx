'use client'

import { TextField, useDocumentInfo, useField, useFormProcessing, useFormSubmitted, useLocale } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { filterTitleSuggestions, type TitleSuggestion } from '@/utils/posts/titleSuggestions'

/**
 * Module-level cache of existing post titles, keyed by locale, for the whole
 * JS context (per tab / per dev session). One slim REST fetch per locale; every
 * keystroke filters in-memory (zero DB queries). Goes stale if another editor
 * adds posts mid-session — accepted trade-off; the save-time block hook is the
 * authoritative safety net.
 */
const titleCache = new Map<string, TitleSuggestion[]>()

interface TitlesState {
  locale: string
  titles: TitleSuggestion[]
}

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
  const processing = useFormProcessing()
  const submitted = useFormSubmitted()
  const { value: fieldValue } = useField<{ value?: unknown }>({ path: props.path })

  const [titlesState, setTitlesState] = useState<TitlesState>({ locale, titles: [] })
  const [focused, setFocused] = useState(false)
  const [dismissedValue, setDismissedValue] = useState<string | null>(null)
  const lastProcessingRef = useRef(processing)

  const value = typeof fieldValue === 'string' ? fieldValue : ''

  // Loads (and caches) the existing post titles for a locale. `force` bypasses
  // the cache — used to refresh after a successful save so the just-created
  // title is suggested on the next post. Race-guarded: the response is cached
  // under the REQUESTED locale and ignored once a newer fetch has started.
  const loadTitles = useCallback((targetLocale: string, force = false): (() => void) => {
    const cached = force ? undefined : titleCache.get(targetLocale)
    if (cached) {
      return () => {}
    }

    let cancelled = false
    const controller = new AbortController()

    fetch(FETCH_URL(targetLocale), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as { docs?: TitleSuggestion[] }
      })
      .then((json) => {
        if (cancelled) return
        const docs = json.docs ?? []
        titleCache.set(targetLocale, docs)
        setTitlesState({ locale: targetLocale, titles: docs })
      })
      .catch((err) => {
        // Unavailable (network, permissions, abort): suggestions silently off for the session.
        if (!cancelled) console.error('Failed to load existing post titles:', err)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const cached = titleCache.get(locale)
    if (cached) return

    return loadTitles(locale)
  }, [locale, loadTitles])

  const suggestions = useMemo(() => {
    const cachedTitles = titleCache.get(locale)
    const availableTitles = cachedTitles ?? (titlesState.locale === locale ? titlesState.titles : [])
    return filterTitleSuggestions(value, availableTitles, documentId)
  }, [value, titlesState, documentId, locale])

  // On a COMPLETED save (processing true→false) that did not fail (submitted is
  // false only on success — Payload sets it true on validation/HTTP errors),
  // refresh the locale cache so a just-created title shows as used next time.
  useEffect(() => {
    const wasProcessing = lastProcessingRef.current
    if (wasProcessing && !processing && !submitted) {
      loadTitles(locale, true)
    }
    lastProcessingRef.current = processing
  }, [processing, submitted, value, locale, loadTitles])

  const isDismissed = dismissedValue === value
  const showDropdown = focused && !isDismissed && suggestions.length > 0

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setDismissedValue(value)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showDropdown, value])

  return (
    <div
      // `field-type` mirrors Payload's own field wrapper class so this stays a direct child of
      // `.render-fields` (the CSS spacing rule is `.render-fields > .field-type`). Without it,
      // this wrapper breaks that selector and Payload renders zero margin below the title field.
      className="field-type title-suggest"
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      style={{ position: 'relative' }}
    >
      <TextField {...props} />
      {showDropdown && (
        <ul
          aria-label={locale === 'de' ? 'Bereits verwendete Titel' : 'Already used titles'}
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
                <span style={{ color: 'var(--theme-elevation-500)', marginLeft: '8px' }}>
                  {s.categories.join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TitleSuggestField
