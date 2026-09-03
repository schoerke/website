export interface ParsedEventDateLine {
  date?: string
  error?: string
  location?: string
  url?: string
}

const months: Record<string, number> = {
  januar: 1,
  january: 1,
  jan: 1,
  februar: 2,
  february: 2,
  feb: 2,
  maerz: 3,
  marz: 3,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mai: 5,
  may: 5,
  juni: 6,
  june: 6,
  jun: 6,
  juli: 7,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  dezember: 12,
  dez: 12,
  december: 12,
  dec: 12,
}

const monthNames = [...Object.keys(months), 'ma\\p{M}*rz'].join('|')
const germanMonthPattern = new RegExp(`^(\\d{1,2})\\.\\s*(${monthNames})\\.?\\s+(\\d{4})(.*)$`, 'iu')
const englishMonthPattern = new RegExp(`^(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})(.*)$`, 'iu')
const isoPattern = /^(\d{4})-(\d{2})-(\d{2})(.*)$/
const numericPattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(.*)$/

function normalizeMonth(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en-US')
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function canonicalDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}T12:00:00.000Z`
}

function parseLocation(value: string): string {
  return value.replace(/^[\s,\-\u2013\u2014]+/, '').trim()
}

function hasDateRange(remainder: string): boolean {
  const monthDate = `(?:\\d{1,2}\\.?\\s+(?:${monthNames})(?:\\.?\\s+\\d{4})?|(?:${monthNames})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?)`
  const date = `(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[./-]\\d{1,2}[./-]\\d{4}|${monthDate})`
  return new RegExp(`^\\s*(?:[-/\\u2013\\u2014]|bis|to|until)\\s*${date}\\b`, 'i').test(remainder)
}

function hasRelativeDateTerm(value: string): boolean {
  return /\b(?:morgen|tomorrow|heute|today|gestern|yesterday)\b/i.test(value)
}

function removeTerminalDatePunctuation(remainder: string): string {
  return /^\.(?:\s|$)/.test(remainder) ? remainder.slice(1) : remainder
}

function parseDate(
  line: string
): { day: number; month: number; normalizedDateLength: number; year: number } | undefined {
  const iso = line.match(isoPattern)
  if (iso) {
    return {
      day: Number(iso[3]),
      month: Number(iso[2]),
      normalizedDateLength: iso[0].length - iso[4].length,
      year: Number(iso[1]),
    }
  }

  const german = line.match(germanMonthPattern)
  if (german) {
    return {
      day: Number(german[1]),
      month: months[normalizeMonth(german[2])],
      normalizedDateLength: german[0].length - german[4].length,
      year: Number(german[3]),
    }
  }

  const english = line.match(englishMonthPattern)
  if (english) {
    return {
      day: Number(english[2]),
      month: months[normalizeMonth(english[1])],
      normalizedDateLength: english[0].length - english[4].length,
      year: Number(english[3]),
    }
  }

  const numeric = line.match(numericPattern)
  if (numeric) {
    return {
      day: Number(numeric[1]),
      month: Number(numeric[2]),
      normalizedDateLength: numeric[0].length - numeric[4].length,
      year: Number(numeric[3]),
    }
  }
}

function originalRemainder(source: string, normalizedDateLength: number): string {
  for (let index = 0; index <= source.length; index++) {
    if (source.slice(0, index).normalize('NFKD').length === normalizedDateLength) {
      return source.slice(index)
    }
  }
  return ''
}

export function validateEventUrl(value: string | undefined): { error?: string; url?: string } {
  const trimmed = value?.trim()
  if (!trimmed) return {}
  if (!/^https?:\/\//i.test(trimmed)) return { error: 'URL must be a valid HTTP(S) URL' }

  try {
    const url = new URL(trimmed)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return { error: 'URL must be an HTTP(S) URL without credentials' }
    }
    return { url: url.toString() }
  } catch {
    return { error: 'Please enter a valid URL' }
  }
}

export function parseEventDateLine(line: string, url?: string): ParsedEventDateLine {
  const source = line.trim()
  const normalizedSource = source.normalize('NFKD')
  const parsed = parseDate(normalizedSource)
  if (!parsed) return { error: 'Date must use a supported complete format' }
  if (!isCalendarDate(parsed.year, parsed.month, parsed.day)) return { error: 'Date is not a valid calendar day' }
  const remainder = originalRemainder(source, parsed.normalizedDateLength)
  if (hasDateRange(remainder.normalize('NFKD'))) return { error: 'Date ranges are not supported' }
  if (hasRelativeDateTerm(normalizedSource)) return { error: 'Relative dates are not supported' }

  const location = parseLocation(removeTerminalDatePunctuation(remainder))
  if (!location) return { error: 'Location is required' }

  const validatedUrl = validateEventUrl(url)
  if (validatedUrl.error) return { error: validatedUrl.error }

  return {
    date: canonicalDate(parsed.year, parsed.month, parsed.day),
    location,
    url: validatedUrl.url,
  }
}
