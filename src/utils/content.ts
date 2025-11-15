export function getQuoteMarks(locale: string): [string, string] {
  const quoteMarks: Record<string, [string, string]> = {
    de: ['„', '“'],
    en: ['“', '”'],
    fr: ['«\u00A0', '\u00A0»'],
    // Add more locales as needed
  }
  return quoteMarks[locale] || ['“', '”']
}
