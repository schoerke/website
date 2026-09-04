import { normalizeDisplayText } from './parser'

export interface DraftSource {
  sourceId: string
  originalText: string
  discardedLinkUrl?: string
  parseError?: string
}

export interface DraftPerformer extends DraftSource {
  type: 'performer'
  name: string
  instrument?: string
}

export interface DraftGroup extends DraftSource {
  type: 'ensembleGroup'
  groupName: string
  members: DraftPerformer[]
}

export type DraftItem = DraftPerformer | DraftGroup

export type ConvertedItem =
  | { blockType: 'performer'; name: string; instrument?: string }
  | { blockType: 'ensembleGroup'; groupName: string; members: { name: string; instrument?: string }[] }

export type ConvertedItemsResult = { ok: true; items: ConvertedItem[] } | { ok: false; reasons: string[] }

function moveItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const targetIndex = index + offset
  if (targetIndex < 0 || targetIndex >= items.length) return items

  const result = [...items]
  ;[result[index], result[targetIndex]] = [result[targetIndex], result[index]]
  return result
}

function findMemberGroup(draft: DraftItem[], sourceId: string): number {
  return draft.findIndex(
    (item) => item.type === 'ensembleGroup' && item.members.some((member) => member.sourceId === sourceId)
  )
}

function normalizePerformer(performer: DraftPerformer): { name: string; instrument?: string } | undefined {
  const name = normalizeDisplayText(performer.name)
  if (!name) return undefined

  const instrument = normalizeDisplayText(performer.instrument ?? '')
  return instrument ? { name, instrument } : { name }
}

export function autoNestPerformers(draft: DraftItem[]): DraftItem[] {
  const result: DraftItem[] = []
  let currentGroup: DraftGroup | undefined

  for (const item of draft) {
    if (item.type === 'ensembleGroup') {
      currentGroup = { ...item, members: [...item.members] }
      result.push(currentGroup)
    } else if (currentGroup) {
      currentGroup.members.push(item)
    } else {
      result.push(item)
    }
  }

  return result
}

export function nestInPreviousGroup(draft: DraftItem[], sourceId: string): DraftItem[] {
  const itemIndex = draft.findIndex((item) => item.type === 'performer' && item.sourceId === sourceId)
  if (itemIndex <= 0 || draft[itemIndex - 1].type !== 'ensembleGroup') return draft

  const group = draft[itemIndex - 1]
  const performer = draft[itemIndex]
  if (group.type !== 'ensembleGroup' || performer.type !== 'performer') return draft

  return [
    ...draft.slice(0, itemIndex - 1),
    { ...group, members: [...group.members, performer] },
    ...draft.slice(itemIndex + 1),
  ]
}

export function unnestMember(draft: DraftItem[], sourceId: string): DraftItem[] {
  const groupIndex = findMemberGroup(draft, sourceId)
  if (groupIndex === -1) return draft

  const group = draft[groupIndex]
  if (group.type !== 'ensembleGroup') return draft
  const memberIndex = group.members.findIndex((member) => member.sourceId === sourceId)
  const member = group.members[memberIndex]

  return [
    ...draft.slice(0, groupIndex),
    { ...group, members: group.members.filter((member) => member.sourceId !== sourceId) },
    member,
    ...draft.slice(groupIndex + 1),
  ]
}

export function moveDraftItemUp(draft: DraftItem[], sourceId: string): DraftItem[] {
  return moveDraftItem(draft, sourceId, -1)
}

export function moveDraftItemDown(draft: DraftItem[], sourceId: string): DraftItem[] {
  return moveDraftItem(draft, sourceId, 1)
}

function moveDraftItem(draft: DraftItem[], sourceId: string, offset: -1 | 1): DraftItem[] {
  const topLevelIndex = draft.findIndex((item) => item.sourceId === sourceId)
  if (topLevelIndex !== -1) return moveItem(draft, topLevelIndex, offset)

  const groupIndex = findMemberGroup(draft, sourceId)
  if (groupIndex === -1) return draft
  const group = draft[groupIndex]
  if (group.type !== 'ensembleGroup') return draft
  const memberIndex = group.members.findIndex((member) => member.sourceId === sourceId)
  const members = moveItem(group.members, memberIndex, offset)
  if (members === group.members) return draft

  return draft.map((item, index) => (index === groupIndex ? { ...group, members } : item))
}

export function deleteDraftItem(draft: DraftItem[], sourceId: string): DraftItem[] {
  const itemIndex = draft.findIndex((item) => item.sourceId === sourceId)
  if (itemIndex !== -1) {
    const item = draft[itemIndex]
    return item.type === 'ensembleGroup'
      ? [...draft.slice(0, itemIndex), ...item.members, ...draft.slice(itemIndex + 1)]
      : [...draft.slice(0, itemIndex), ...draft.slice(itemIndex + 1)]
  }

  const groupIndex = findMemberGroup(draft, sourceId)
  if (groupIndex === -1) return draft
  const group = draft[groupIndex]
  if (group.type !== 'ensembleGroup') return draft

  return draft.map((item, index) =>
    index === groupIndex ? { ...group, members: group.members.filter((member) => member.sourceId !== sourceId) } : item
  )
}

export function toConvertedItems(draft: DraftItem[]): ConvertedItemsResult {
  if (draft.length === 0) return { ok: false, reasons: ['At least one item is required'] }

  const reasons: string[] = []
  const items: ConvertedItem[] = []

  for (const item of draft) {
    if (item.type === 'performer') {
      const performer = normalizePerformer(item)
      if (!performer) reasons.push(`Performer "${item.sourceId}" needs a name`)
      else items.push({ blockType: 'performer', ...performer })
      continue
    }

    const groupName = normalizeDisplayText(item.groupName)
    if (!groupName) {
      reasons.push(`Group "${item.sourceId}" needs a name`)
      continue
    }
    if (item.members.length === 0) {
      reasons.push(`Group "${groupName}" needs at least one member`)
      continue
    }

    const members = item.members.flatMap((member) => {
      const normalized = normalizePerformer(member)
      if (!normalized) reasons.push(`Member "${member.sourceId}" needs a name`)
      return normalized ? [normalized] : []
    })
    if (members.length === item.members.length) items.push({ blockType: 'ensembleGroup', groupName, members })
  }

  return reasons.length > 0 ? { ok: false, reasons } : { ok: true, items }
}
