const QUOTATION_MARKS = new Set(['"', "'", '“', '”', '‘', '’', '„', '»', '«', '‹', '›'])

export function hasBoundaryQuotationMark(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const text = value.trim()
  return Boolean(text) && (QUOTATION_MARKS.has(text[0]) || QUOTATION_MARKS.has(text[text.length - 1]))
}
