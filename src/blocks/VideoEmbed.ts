import type { Block } from 'payload'

import { validateVideoURL } from '@/validators/fields'
import { validateVideoEmbedCode } from '@/validators/videoFields'

/**
 * Video Embed Block Field Types
 */
export interface VideoEmbedBlockFields {
  url?: string
  embedCode?: string
  aspectRatio?: '16:9' | '4:3' | '21:9'
}

/**
 * Video Embed Block
 *
 * Allows embedding videos within rich text content, either by URL or by pasting
 * a provider-supplied <iframe> embed code.
 *
 * URL path (uses validateVideoURL):
 * - YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live|embed|shorts/ID
 * - arte.tv: arte.tv/{locale}/videos/{ID}/...
 *
 * Embed code path (uses validateVideoEmbedCode):
 * - raw <iframe> snippet from an allowlisted host (rts.ch, rsi.ch, ardmediathek.de)
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
  admin: {
    // Payload's default block-name input in the lexical editor header has
    // an upstream focus-stealing bug: typing into it can drop the cursor
    // into the surrounding post content. blockName isn't used anywhere in
    // this app, so it's disabled here rather than exposing a broken input.
    disableBlockName: true,
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: false,
      label: {
        en: 'Video URL',
        de: 'Video-URL',
      },
      admin: {
        placeholder: 'arte.tv/de/videos/...',
        description: {
          en: 'YouTube or arte.tv URL (leave empty when using an embed code)',
          de: 'YouTube- oder arte.tv-URL (bei Einbettungscode leer lassen)',
        },
        condition: (_, siblingData) => !siblingData?.embedCode,
      },
      validate: validateVideoURL,
    },
    {
      name: 'embedCode',
      type: 'textarea',
      required: false,
      label: {
        en: 'Embed Code',
        de: 'Einbettungscode',
      },
      admin: {
        placeholder:
          '<iframe src="https://www.ardmediathek.de/embed/Y3JpZDovL2FyZC5kZS92aWRlby0xNjA4Nw?clientType=ardde" width="100%" height="315" allowfullscreen></iframe>',
        description: {
          en: 'Paste an <iframe> embed code from a supported provider (e.g. RSI, ARD Mediathek, RTS). If the embed looks cropped or oversized on the site, edit the width/height values in the pasted code and save again.',
          de: '<iframe>-Einbettungscode eines unterstützten Anbieters einfügen (z. B. RSI, ARD Mediathek, RTS). Falls die Einbettung auf der Website abgeschnitten oder zu groß wirkt, die Werte für width/height im eingefügten Code anpassen und erneut speichern.',
        },
        condition: (_, siblingData) => !siblingData?.url,
        rows: 4,
      },
      validate: validateVideoEmbedCode,
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
