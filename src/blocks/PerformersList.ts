import type { Block, TextFieldValidation } from 'payload'
import { text } from 'payload/shared'

export interface PerformerItem {
  id?: string
  blockType: 'performer'
  name: string
  instrument?: string | null
}

export interface EnsembleGroupItem {
  id?: string
  blockType: 'ensembleGroup'
  groupName: string
  members?: { id?: string; name: string; instrument?: string | null }[] | null
}

export interface PerformersListBlockFields {
  title?: string | null
  items?: (PerformerItem | EnsembleGroupItem)[] | null
}

export const validateRequiredText: TextFieldValidation = (value, args) => {
  const result = text(value, args)

  if (result !== true) return result

  return typeof value === 'string' && value.trim() ? true : args.req.t('validation:required')
}

export const PerformersList: Block = {
  slug: 'performersList',
  labels: {
    singular: { en: 'PerformersList', de: 'PerformersList' },
    plural: { en: 'PerformersLists', de: 'PerformersLists' },
  },
  admin: {
    disableBlockName: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: false,
      label: { en: 'Title', de: 'Titel' },
    },
    {
      name: 'items',
      type: 'blocks',
      required: true,
      minRows: 1,
      labels: {
        singular: { en: 'Item', de: 'Element' },
        plural: { en: 'Items', de: 'Elemente' },
      },
      blocks: [
        {
          slug: 'performer',
          labels: {
            singular: { en: 'Performer', de: 'Mitwirkende:r' },
            plural: { en: 'Performers', de: 'Mitwirkende' },
          },
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              label: { en: 'Name', de: 'Name' },
              validate: validateRequiredText,
            },
            {
              name: 'instrument',
              type: 'text',
              required: false,
              label: { en: 'Instrument', de: 'Instrument' },
            },
          ],
        },
        {
          slug: 'ensembleGroup',
          labels: {
            singular: { en: 'Ensemble Group', de: 'Ensemble' },
            plural: { en: 'Ensemble Groups', de: 'Ensembles' },
          },
          fields: [
            {
              name: 'groupName',
              type: 'text',
              required: true,
              label: { en: 'Ensemble Name', de: 'Ensemble-Name' },
              validate: validateRequiredText,
            },
            {
              name: 'members',
              type: 'array',
              required: true,
              minRows: 1,
              labels: {
                singular: { en: 'Member', de: 'Mitglied' },
                plural: { en: 'Members', de: 'Mitglieder' },
              },
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  required: true,
                  label: { en: 'Name', de: 'Name' },
                  validate: validateRequiredText,
                },
                {
                  name: 'instrument',
                  type: 'text',
                  required: false,
                  label: { en: 'Instrument', de: 'Instrument' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
