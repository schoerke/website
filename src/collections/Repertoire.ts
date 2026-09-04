import {
  BlocksFeature,
  BoldFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { AudioEmbed } from '@/blocks/AudioEmbed'
import { PerformersList } from '@/blocks/PerformersList'
import { VideoEmbed } from '@/blocks/VideoEmbed'
import { revalidateRepertoireOnChange, revalidateRepertoireOnDelete } from '@/collections/hooks/revalidateRepertoire'
import { syncArtistRepertoire, syncArtistRepertoireOnDelete } from '@/collections/hooks/syncArtistRepertoire'

export const Repertoire: CollectionConfig = {
  slug: 'repertoire',
  labels: {
    singular: {
      de: 'Repertoire',
      en: 'Repertoire',
    },
    plural: {
      de: 'Repertoire',
      en: 'Repertoire',
    },
  },
  access: {
    read: () => true, // Public read access (Edge Case 11)
  },
  admin: {
    useAsTitle: 'title',
    group: 'Content Management',
    defaultColumns: ['title', 'artists', 'roles', 'updatedAt'],
    listSearchableFields: ['title', 'artists.name'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: {
        en: 'Title',
        de: 'Titel',
      },
      admin: {
        description: {
          en: 'Examples: "Duo Ruth Killius & Thomas Zehetmair", "Christian Zacharias Play/Conduct", "Maurice Steger Recorder", "Mario Venzago Conductor"',
          de: 'Beispiele: "Duo Ruth Killius & Thomas Zehetmair", "Christian Zacharias Play/Conduct", "Maurice Steger Recorder", "Mario Venzago Conductor"',
        },
      },
    },
    {
      name: 'artists',
      type: 'relationship',
      relationTo: 'artists',
      hasMany: true,
      required: false, // Edge Case 3: Allow orphan repertoires
      label: {
        en: 'Artists',
        de: 'Künstler',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Artist(s) performing this repertoire. Can link to multiple artists for duos/ensembles.',
          de: 'Künstler, die dieses Repertoire aufführen. Kann für Duos/Ensembles mit mehreren Künstlern verknüpft werden.',
        },
      },
      validate: async (value, { req }) => {
        if (!Array.isArray(value)) return true
        for (const item of value) {
          const artistId =
            typeof item === 'number' || typeof item === 'string'
              ? Number(item)
              : typeof item === 'object' && item !== null
                ? Number((item as { value: number | string }).value)
                : NaN
          if (Number.isNaN(artistId)) continue
          const result = await req.payload.findByID({
            collection: 'artists',
            id: artistId,
            select: { name: true, repertoire: true },
            depth: 0,
          })
          if (result?.repertoire && Array.isArray(result.repertoire) && result.repertoire.length >= 5) {
            return `"${result.name}" already has 5 repertoire lists. Remove a list before adding more.`
          }
        }
        return true
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      localized: true,
      label: {
        en: 'Repertoire Content',
        de: 'Repertoire-Inhalt',
      },
      admin: {
        description: {
          en: 'List of works in this repertoire section (text, video/audio embeds, performer lists; links are not supported)',
          de: 'Liste der Werke in diesem Repertoire-Abschnitt (Text, Video-/Audio-Einbettungen, Mitwirkendenlisten; Links werden nicht unterstützt)',
        },
      },
      // Configure Lexical editor to exclude LinkFeature
      editor: lexicalEditor({
        features: () => [
          // Basic text formatting features
          ParagraphFeature(),
          HeadingFeature({
            enabledHeadingSizes: ['h2', 'h3', 'h4'],
          }),
          BoldFeature(),
          ItalicFeature(),
          UnderlineFeature(),
          OrderedListFeature(),
          UnorderedListFeature(),
          // Inline toolbar for text selection
          InlineToolbarFeature(),
          // Audio/video embed blocks (same as posts)
          BlocksFeature({
            blocks: [VideoEmbed, AudioEmbed, PerformersList],
          }),
          // LinkFeature is intentionally excluded
        ],
      }),
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true, // Edge Case 9: Multi-select for "Play/Conduct" case
      required: false, // Edge Case 10: Allow empty roles
      options: [
        {
          value: 'solo',
          label: {
            en: 'Solo',
            de: 'Solo',
          },
        },
        {
          value: 'chamber',
          label: {
            en: 'Chamber Music',
            de: 'Kammermusik',
          },
        },
        {
          value: 'conductor',
          label: {
            en: 'Conductor',
            de: 'Dirigent',
          },
        },
      ],
      label: {
        en: 'Roles',
        de: 'Rollen',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Select artist roles for this repertoire (optional). For Play/Conduct, select both Solo AND Conductor.',
          de: 'Wählen Sie Künstlerrollen für dieses Repertoire (optional). Für Play/Conduct wählen Sie sowohl Solo ALS AUCH Dirigent.',
        },
      },
    },
  ],
  hooks: {
    afterChange: [syncArtistRepertoire, revalidateRepertoireOnChange],
    afterDelete: [syncArtistRepertoireOnDelete, revalidateRepertoireOnDelete],
  },
}
