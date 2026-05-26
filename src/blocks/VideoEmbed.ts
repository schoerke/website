import type { Block } from 'payload'

import { validateVideoURL } from '@/validators/fields'

/**
 * Video Embed Block Field Types
 */
export interface VideoEmbedBlockFields {
  url: string
  aspectRatio?: '16:9' | '4:3' | '21:9'
}

/**
 * Video Embed Block
 *
 * Allows embedding YouTube and arte.tv videos within rich text content.
 * Uses existing validateVideoURL validator for URL validation.
 *
 * Supported platforms:
 * - YouTube: youtube.com/watch?v=ID, youtu.be/ID
 * - arte.tv: arte.tv/{locale}/videos/{ID}/...
 */
export const VideoEmbed: Block = {
  slug: 'videoEmbed',
  labels: {
    singular: {
      en: 'Video Embed',
      de: 'Video-Einbettung',
    },
    plural: {
      en: 'Video Embeds',
      de: 'Video-Einbettungen',
    },
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: {
        en: 'Video URL',
        de: 'Video-URL',
      },
      admin: {
        placeholder: 'https://www.youtube.com/watch?v=... or https://www.arte.tv/de/videos/...',
        description: {
          en: 'Supports YouTube and arte.tv URLs',
          de: 'Unterstützt YouTube- und arte.tv-URLs',
        },
      },
      validate: validateVideoURL,
    },
    {
      name: 'aspectRatio',
      type: 'select',
      defaultValue: '16:9',
      label: {
        en: 'Aspect Ratio',
        de: 'Seitenverhältnis',
      },
      admin: {
        description: {
          en: 'Video player aspect ratio',
          de: 'Seitenverhältnis des Videoplayers',
        },
      },
      options: [
        { label: '16:9 (Standard)', value: '16:9' },
        { label: '4:3', value: '4:3' },
        { label: '21:9 (Ultrawide)', value: '21:9' },
      ],
    },
  ],
}
