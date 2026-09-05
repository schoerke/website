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
    singular: { en: 'Performers List', de: 'Künstlerliste' },
    plural: { en: 'Performers Lists', de: 'Künstlerlisten' },
  },
  admin: {
    disableBlockName: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: false,
      label: { en: 'Title (optional)', de: 'Titel (optional)' },
    },
    {
      name: 'items',
      type: 'blocks',
      required: true,
      minRows: 1,
      label: { en: 'Performers', de: 'Mitwirkende' },
      labels: {
        singular: { en: 'Performer or Ensemble Group', de: 'Künstler:in oder Ensemble' },
        plural: { en: 'Performers', de: 'Mitwirkende' },
      },
      blocks: [
        {
          slug: 'performer',
          labels: {
            singular: { en: 'Performer', de: 'Mitwirkende:r' },
            plural: { en: 'Performers', de: 'Mitwirkende' },
          },
          admin: {
            components: {
              Label: './blocks/components/PerformerRowLabel',
            },
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
          admin: {
            components: {
              Label: './blocks/components/EnsembleGroupRowLabel',
            },
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
              admin: {
                components: {
                  RowLabel: './blocks/components/EnsembleMemberRowLabel',
                },
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
