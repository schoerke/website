// @vitest-environment node

import type { BasePayload, PayloadRequest, RichTextField, SanitizedConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import { Posts } from './Posts'

const minimalConfig = {
  blocks: [],
  collections: [],
  globals: [],
  i18n: { translations: {} },
} as unknown as SanitizedConfig

function getContentField(): RichTextField {
  const field = Posts.fields?.find((candidate) => 'name' in candidate && candidate.name === 'content')

  if (!field || field.type !== 'richText') throw new Error('Posts.content rich text field is missing')

  return field
}

async function validateContent(value: object): Promise<string | true> {
  const content = getContentField()

  if (typeof content.editor !== 'function') throw new Error('Posts.content editor is missing')

  const editor = await content.editor({
    config: minimalConfig,
    isRoot: true,
    parentIsLocalized: true,
  })

  return await editor.validate(value, {
    blockData: {},
    collectionSlug: 'posts',
    data: {},
    name: 'content',
    operation: 'create',
    path: ['content'],
    preferences: { fields: {} },
    req: {
      locale: 'en',
      payload: { blocks: {}, config: minimalConfig } as unknown as BasePayload,
      t: (key: string) => key,
    } as unknown as PayloadRequest,
    required: true,
    siblingData: {},
    type: 'richText',
  })
}

function performersListContent(fields: object): object {
  return {
    root: {
      children: [{ fields: { blockType: 'performersList', ...fields }, type: 'block', version: 1 }],
    },
  }
}

describe('Posts PerformersList Lexical validation', () => {
  it.each([
    ['empty items', { items: [] }, 'items'],
    [
      'empty ensemble members',
      { items: [{ blockType: 'ensembleGroup', groupName: 'Ensemble', members: [] }] },
      'items.0.members',
    ],
    ['whitespace performer name', { items: [{ blockType: 'performer', name: '  ' }] }, 'items.0.name'],
    [
      'whitespace ensemble name',
      { items: [{ blockType: 'ensembleGroup', groupName: '  ', members: [{ name: 'Member' }] }] },
      'items.0.groupName',
    ],
    [
      'whitespace ensemble member name',
      { items: [{ blockType: 'ensembleGroup', groupName: 'Ensemble', members: [{ name: '  ' }] }] },
      'items.0.members.0.name',
    ],
  ])('rejects %s through configured Payload Lexical block validation', async (_, fields, errorPath) => {
    await expect(validateContent(performersListContent(fields))).resolves.toBe(
      `block node failed to validate: The following fields are invalid: ${errorPath}`
    )
  })

  it('rejects an unknown nested block type through Payload block traversal', async () => {
    await expect(validateContent(performersListContent({ items: [{ blockType: 'unknown' }] }))).rejects.toThrow(
      'Block with type "unknown" was found in block data'
    )
  })

  it('accepts a performer and ensemble group with a member through configured Payload Lexical validation', async () => {
    await expect(
      validateContent(
        performersListContent({
          items: [
            { blockType: 'performer', instrument: 'Violin', name: 'Tianwa Yang' },
            {
              blockType: 'ensembleGroup',
              groupName: 'String Quartet',
              members: [{ instrument: 'Viola', name: 'Nils Monkemeyer' }],
            },
          ],
        })
      )
    ).resolves.toBe(true)
  })
})
