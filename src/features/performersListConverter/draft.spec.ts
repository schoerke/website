import { describe, expect, it } from 'vitest'

import {
  autoNestPerformers,
  deleteDraftItem,
  moveDraftItemDown,
  moveDraftItemUp,
  nestInPreviousGroup,
  toConvertedItems,
  unnestMember,
  type DraftGroup,
  type DraftItem,
  type DraftPerformer,
} from './draft'

const performer = (sourceId: string, name: string, instrument?: string): Extract<DraftItem, { type: 'performer' }> => ({
  type: 'performer',
  sourceId,
  originalText: `${name}${instrument ? ` | ${instrument}` : ''}`,
  discardedLinkUrl: `https://example.test/${sourceId}`,
  name,
  instrument,
})

const group = (
  sourceId: string,
  groupName: string,
  members: DraftPerformer[] = []
): Extract<DraftItem, { type: 'ensembleGroup' }> => ({
  type: 'ensembleGroup',
  sourceId,
  originalText: groupName,
  discardedLinkUrl: `https://example.test/${sourceId}`,
  groupName,
  members,
})

function expectDraftUnchanged(draft: DraftItem[], mutate: (input: DraftItem[]) => DraftItem[]): void {
  const snapshot = structuredClone(draft)
  const firstItem = draft[0]
  const firstMembers = firstItem?.type === 'ensembleGroup' ? firstItem.members : undefined

  mutate(draft)

  expect(draft).toEqual(snapshot)
  expect(draft[0]).toBe(firstItem)
  if (firstItem?.type === 'ensembleGroup') expect(firstItem.members).toBe(firstMembers)
}

describe('autoNestPerformers', () => {
  it('nests three performers after a group as members', () => {
    const result = autoNestPerformers([
      group('group', 'Trio Catch'),
      performer('martin', 'Martin Adamek', 'Klarinette'),
      performer('eva', 'Eva Boesch', 'Violoncello'),
      performer('sun-young', 'Sun-Young Nam', 'Klavier'),
    ])

    expect(result).toEqual([
      group('group', 'Trio Catch', [
        performer('martin', 'Martin Adamek', 'Klarinette'),
        performer('eva', 'Eva Boesch', 'Violoncello'),
        performer('sun-young', 'Sun-Young Nam', 'Klavier'),
      ]),
    ])
  })

  it('stops nesting at the next group and preserves leading performers', () => {
    const result = autoNestPerformers([
      performer('solo', 'Tianwa Yang', 'Violine'),
      group('trio', 'Trio Catch'),
      performer('martin', 'Martin Adamek'),
      group('quartet', 'Quartet'),
      performer('eva', 'Eva Boesch'),
    ])

    expect(result).toEqual([
      performer('solo', 'Tianwa Yang', 'Violine'),
      group('trio', 'Trio Catch', [performer('martin', 'Martin Adamek')]),
      group('quartet', 'Quartet', [performer('eva', 'Eva Boesch')]),
    ])
  })
})

describe('draft mutations', () => {
  it('does not mutate input arrays, rows, or member arrays', () => {
    expectDraftUnchanged([group('group', 'Trio'), performer('member', 'Member')], autoNestPerformers)
    expectDraftUnchanged([group('group', 'Trio'), performer('member', 'Member')], (draft) =>
      nestInPreviousGroup(draft, 'member')
    )
    expectDraftUnchanged([group('group', 'Trio', [performer('member', 'Member')])], (draft) =>
      unnestMember(draft, 'member')
    )
    expectDraftUnchanged([performer('first', 'First'), performer('second', 'Second')], (draft) =>
      moveDraftItemUp(draft, 'second')
    )
    expectDraftUnchanged(
      [group('group', 'Trio', [performer('first', 'First'), performer('second', 'Second')])],
      (draft) => moveDraftItemDown(draft, 'first')
    )
    expectDraftUnchanged([group('group', 'Trio', [performer('member', 'Member')])], (draft) =>
      deleteDraftItem(draft, 'group')
    )
  })

  it('nests a top-level performer in its immediately preceding group and preserves source data', () => {
    const result = nestInPreviousGroup([group('group', 'Trio'), performer('member', 'Martin', 'Clarinet')], 'member')

    expect(result).toEqual([group('group', 'Trio', [performer('member', 'Martin', 'Clarinet')])])
    expect(result[0]).toMatchObject({
      sourceId: 'group',
      originalText: 'Trio',
      discardedLinkUrl: 'https://example.test/group',
    })
    expect((result[0] as DraftGroup).members[0]).toMatchObject({
      sourceId: 'member',
      originalText: 'Martin | Clarinet',
      discardedLinkUrl: 'https://example.test/member',
    })
  })

  it('unnests a member immediately after its group and preserves source data', () => {
    const result = unnestMember([group('group', 'Trio', [performer('member', 'Martin', 'Clarinet')])], 'member')

    expect(result).toEqual([group('group', 'Trio'), performer('member', 'Martin', 'Clarinet')])
    expect(result[1]).toMatchObject({
      sourceId: 'member',
      originalText: 'Martin | Clarinet',
      discardedLinkUrl: 'https://example.test/member',
    })
  })

  it('reorders top-level and member rows only within their current lists', () => {
    const draft = [
      performer('first', 'First'),
      performer('second', 'Second'),
      group('group', 'Trio', [performer('member-one', 'One'), performer('member-two', 'Two')]),
    ]

    expect(moveDraftItemUp(draft, 'second')).toEqual([
      performer('second', 'Second'),
      performer('first', 'First'),
      draft[2],
    ])
    expect(moveDraftItemDown(draft, 'member-one')).toEqual([
      draft[0],
      draft[1],
      group('group', 'Trio', [performer('member-two', 'Two'), performer('member-one', 'One')]),
    ])
    expect(moveDraftItemUp(draft, 'first')).toBe(draft)
    expect(moveDraftItemDown(draft, 'member-two')).toBe(draft)
  })

  it('deletes groups by promoting members and deletes performers or members outright', () => {
    const draft = [group('group', 'Trio', [performer('member', 'Member')]), performer('solo', 'Solo')]

    expect(deleteDraftItem(draft, 'group')).toEqual([performer('member', 'Member'), performer('solo', 'Solo')])
    expect(deleteDraftItem(draft, 'group')[0]).toMatchObject({
      sourceId: 'member',
      originalText: 'Member',
      discardedLinkUrl: 'https://example.test/member',
    })
    expect(deleteDraftItem(draft, 'member')).toEqual([group('group', 'Trio'), performer('solo', 'Solo')])
    expect(deleteDraftItem(draft, 'solo')).toEqual([draft[0]])
  })
})

describe('toConvertedItems', () => {
  it('normalizes final fields and omits blank optional instruments', () => {
    const result = toConvertedItems([
      performer('solo', '\u0000 Tianwa Yang\u00A0', '\u001F  '),
      group('group', '\u009F Trio Catch ', [performer('member', '\u00A0 Martin \u00A0', ' Klarinette ')]),
    ])

    expect(result).toEqual({
      ok: true,
      items: [
        { blockType: 'performer', name: 'Tianwa Yang' },
        {
          blockType: 'ensembleGroup',
          groupName: 'Trio Catch',
          members: [{ name: 'Martin', instrument: 'Klarinette' }],
        },
      ],
    })
  })

  it('rejects empty final output, empty groups, and blank required performer or member text', () => {
    expect(toConvertedItems([])).toEqual({ ok: false, reasons: ['At least one item is required'] })
    expect(toConvertedItems([group('group', 'Trio')])).toEqual({
      ok: false,
      reasons: ['Group "Trio" needs at least one member'],
    })
    expect(toConvertedItems([performer('solo', ' \u0000 ')])).toEqual({
      ok: false,
      reasons: ['Performer "solo" needs a name'],
    })
    expect(toConvertedItems([group('group', 'Trio', [performer('member', ' ')])])).toEqual({
      ok: false,
      reasons: ['Member "member" needs a name'],
    })
  })

  it('returns ordered reasons without items when multiple rows are invalid', () => {
    expect(toConvertedItems([performer('solo', ' '), group('group', ' '), group('trio', 'Trio')])).toEqual({
      ok: false,
      reasons: [
        'Performer "solo" needs a name',
        'Group "group" needs a name',
        'Group "Trio" needs at least one member',
      ],
    })
  })

  it('returns no items when a valid performer appears with an invalid row', () => {
    const result = toConvertedItems([performer('valid', 'Tianwa Yang', 'Violine'), performer('invalid', ' ')])

    expect(result).toEqual({ ok: false, reasons: ['Performer "invalid" needs a name'] })
    expect(result).not.toHaveProperty('items')
  })
})
