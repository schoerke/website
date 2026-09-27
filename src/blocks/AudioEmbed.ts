import type { Block } from 'payload'

import { normalizeAudioFileUrl } from '@/utils/audio'
import { validateAudioURL, validateEmbedCode, validateFileURL } from '@/validators/audioFields'

/**
 * Audio Embed Block Field Types
 */
export interface AudioEmbedBlockFields {
  url?: string
  embedCode?: string
  fileUrl?: string
}

/**
 * Audio Embed Block
 *
 * Embeds audio within rich text content. Exactly one of the three fields should be set:
 * - url: Spotify / Apple Music native embeds
 * - embedCode: raw <iframe> snippet from allowlisted providers (e.g. RTS)
 * - fileUrl: direct link to an audio file (e.g. a Dropbox share link), played with a native
 *   HTML5 <audio> element
 */
export const AudioEmbed: Block = {
  slug: 'audioEmbed',
  labels: {
    singular: {
      en: 'Audio Embed',
      de: 'Audio-Einbettung',
    },
    plural: {
      en: 'Audio Embeds',
      de: 'Audio-Einbettungen',
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
        en: 'Audio URL',
        de: 'Audio-URL',
      },
      admin: {
        placeholder: 'https://open.spotify.com/track/... or https://music.apple.com/...',
        description: {
          en: 'Spotify or Apple Music URL (leave empty when using an embed code or audio file URL)',
          de: 'Spotify- oder Apple-Music-URL (bei Einbettungscode oder Audio-Datei-URL leer lassen)',
        },
        condition: (_, siblingData) => !siblingData?.embedCode && !siblingData?.fileUrl,
      },
      validate: validateAudioURL,
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
          '<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" allowfullscreen></iframe>',
        description: {
          en: 'Paste an <iframe> embed code from a supported provider (e.g. RTS). If the embed looks cropped or oversized on the site, edit the width/height values in the pasted code and save again.',
          de: '<iframe>-Einbettungscode eines unterstützten Anbieters einfügen (z. B. RTS). Falls die Einbettung auf der Website abgeschnitten oder zu groß wirkt, die Werte für width/height im eingefügten Code anpassen und erneut speichern.',
        },
        condition: (_, siblingData) => !siblingData?.url && !siblingData?.fileUrl,
        rows: 4,
      },
      validate: validateEmbedCode,
    },
    {
      name: 'fileUrl',
      type: 'text',
      required: false,
      label: {
        en: 'Audio File URL',
        de: 'Audio-Datei-URL',
      },
      admin: {
        placeholder: 'https://www.dropbox.com/s/.../recording.mp3?dl=0',
        description: {
          en: 'Direct link to an audio file (e.g. Dropbox share link). Plays with a simple audio player. Leave the other two fields empty when using this.',
          de: 'Direktlink zu einer Audiodatei (z. B. Dropbox-Freigabelink). Wird mit einem einfachen Audioplayer abgespielt. Die anderen beiden Felder bei Verwendung leer lassen.',
        },
        condition: (_, siblingData) => !siblingData?.url && !siblingData?.embedCode,
      },
      validate: validateFileURL,
      hooks: {
        beforeChange: [
          ({ value }: { value?: string }) =>
            typeof value === 'string' && value ? normalizeAudioFileUrl(value) : value,
        ],
      },
    },
  ],
}
