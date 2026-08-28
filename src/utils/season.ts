export function getConcertSeason(date: Date): string {
  const year = date.getFullYear()

  return date.getMonth() >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}
