import type { ArrayField, Block, BlocksField, Field, PayloadRequest, TextField, TextFieldValidation } from 'payload'
import { text } from 'payload/shared'
import { describe, expect, it } from 'vitest'

import { PerformersList, validateRequiredText } from './PerformersList'

function getField<TName extends string>(fields: Field[], name: TName): Field & { name: TName } {
  const field = fields.find((candidate) => 'name' in candidate && candidate.name === name)

  if (!field || !('name' in field) || field.name !== name) {
    throw new Error(`Missing ${name} field`)
  }

  return field as Field & { name: TName }
}

function getBlocksField(field: Field): BlocksField {
  if (field.type !== 'blocks') {
    throw new Error('Expected blocks field')
  }

  return field
}

function getArrayField(field: Field): ArrayField {
  if (field.type !== 'array') {
    throw new Error('Expected array field')
  }

  return field
}

function getTextField(field: Field): TextField {
  if (field.type !== 'text') {
    throw new Error('Expected text field')
  }

  return field
}

function getBlock(blocks: Block[], slug: string): Block {
  const block = blocks.find((candidate) => candidate.slug === slug)

  if (!block) throw new Error(`Missing ${slug} block`)

  return block
}

function getValidationArgs(): Parameters<TextFieldValidation>[1] {
  const req: Pick<PayloadRequest, 'payload' | 't'> = {
    payload: { config: {} } as PayloadRequest['payload'],
    t: (key) => (key === 'validation:required' ? 'Required field' : key),
  }

  return {
    blockData: {},
    data: {},
    name: 'name',
    path: ['name'],
    preferences: { fields: {} },
    req: req as PayloadRequest,
    required: true,
    siblingData: {},
    type: 'text',
  }
}

describe('PerformersList', () => {
  it('rejects whitespace-only required text', () => {
    expect(validateRequiredText('   ', getValidationArgs())).toBe('Required field')
  })

  it('accepts non-empty required text', () => {
    expect(validateRequiredText('Tianwa Yang', getValidationArgs())).toBe(true)
  })

  it('returns Payload validation result for undefined required text', () => {
    const args = getValidationArgs()

    expect(validateRequiredText(undefined, args)).toBe(text(undefined, args))
  })

  it('returns Payload validation result for null required text', () => {
    const args = getValidationArgs()

    expect(validateRequiredText(null, args)).toBe(text(null, args))
  })

  it('assigns the trim-aware validator to required text fields', () => {
    const items = getBlocksField(getField(PerformersList.fields, 'items'))
    const performer = getBlock(items.blocks, 'performer')
    const name = getTextField(getField(performer.fields, 'name'))
    const ensembleGroup = getBlock(items.blocks, 'ensembleGroup')
    const groupName = getTextField(getField(ensembleGroup.fields, 'groupName'))
    const members = getArrayField(getField(ensembleGroup.fields, 'members'))
    const memberName = getTextField(getField(members.fields, 'name'))

    expect(name.required).toBe(true)
    expect(name.validate).toBe(validateRequiredText)
    expect(groupName.required).toBe(true)
    expect(groupName.validate).toBe(validateRequiredText)
    expect(memberName.required).toBe(true)
    expect(memberName.validate).toBe(validateRequiredText)
  })

  it('defines the required nested block structure', () => {
    const items = getBlocksField(getField(PerformersList.fields, 'items'))
    const ensembleGroup = getBlock(items.blocks, 'ensembleGroup')

    const members = getArrayField(getField(ensembleGroup.fields, 'members'))

    expect(PerformersList.slug).toBe('performersList')
    expect(PerformersList.labels).toEqual({
      singular: { en: 'PerformersList', de: 'PerformersList' },
      plural: { en: 'PerformersLists', de: 'PerformersLists' },
    })
    expect(PerformersList.admin?.disableBlockName).toBe(true)
    expect(items.required).toBe(true)
    expect(items.minRows).toBe(1)
    expect(members.type).toBe('array')
    expect(members.required).toBe(true)
    expect(members.minRows).toBe(1)
  })
})
