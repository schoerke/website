export type ParsedPerformersListLine =
  | { type: 'performer'; name: string; instrument?: string }
  | { type: 'ensembleGroup'; groupName: string }
  | { type: 'invalid'; reason: string }

export function normalizeDisplayText(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0
      return code >= 0x20 && (code < 0x7f || code > 0x9f)
    })
    .join('')
    .trim()
}

export function parsePerformersListLine(value: string): ParsedPerformersListLine {
  const pipeIndex = value.indexOf('|')

  if (pipeIndex === -1) {
    const groupName = normalizeDisplayText(value)
    return groupName ? { type: 'ensembleGroup', groupName } : { type: 'invalid', reason: 'Line must not be empty' }
  }

  const name = normalizeDisplayText(value.slice(0, pipeIndex))
  if (!name) return { type: 'invalid', reason: 'Performer name is required' }

  const instrument = normalizeDisplayText(value.slice(pipeIndex + 1))
  return instrument ? { type: 'performer', name, instrument } : { type: 'performer', name }
}
