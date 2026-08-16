/**
 * Post text-state palette for the Lexical `TextStateFeature`.
 *
 * Plain data (no package imports) so it can be imported by both the Payload field
 * config (admin editor) and the frontend serializer. Keys/values mirror the
 * `TextStateFeature` `state` shape: `{ [stateKey]: { [stateValue]: { label, css } } }`.
 *
 * All options live under a single `style` stateKey so they are mutually exclusive
 * (selecting one replaces the previous). Only highlights are offered: the site renders
 * post content on a white background, and the brand colors as plain text (yellow,
 * silver, platinum) fail WCAG contrast there. Each highlight pre-composes a
 * contrast-safe text color (dark on light backgrounds, white on dark).
 *
 * Brand colors from `DESIGN.md`.
 */

export const postTextState = {
  style: {
    'highlight-yellow': {
      label: 'Yellow Highlight',
      css: { 'background-color': '#FCC302', color: '#222126' },
    },
    'highlight-silver': {
      label: 'Silver Highlight',
      css: { 'background-color': '#ADB2B4', color: '#222126' },
    },
    'highlight-platinum': {
      label: 'Platinum Highlight',
      css: { 'background-color': '#E3E3E3', color: '#222126' },
    },
    'highlight-dark': {
      label: 'Dark Highlight',
      css: { 'background-color': '#222126', color: '#FFFFFF' },
    },
  },
} as const

/**
 * Resolves the inline CSS (hyphen-case keys) for a serialized text node's state.
 * Lexical stores `TextStateFeature` state under the `"$"` key on text nodes as
 * `{ [stateKey]: stateValue }`.
 */
export function resolveTextStateStyle(nodeState: Record<string, string>): Record<string, string> {
  const styles: Record<string, string> = {}
  const groups = postTextState as Record<string, Record<string, { css: Record<string, string> }>>
  for (const [stateKey, stateValue] of Object.entries(nodeState)) {
    const entry = groups[stateKey]?.[stateValue]
    if (entry) {
      Object.assign(styles, entry.css)
    }
  }
  return styles
}