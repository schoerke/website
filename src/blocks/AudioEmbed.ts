import type { Block } from 'payload'

import { validateAudioURL } from '@/validators/audioFields'

/**
 * Audio Embed Block Field Types
 */
export interface AudioEmbedBlockFields {
  url: string
}

/**
 * Audio Embed Block
 *
 * Allows embedding Spotify and Apple Music audio within rich text content.
 * Uses validateAudioURL validator for URL validation.
 *
 * Supported platforms:
 * - Spotify: tracks, albums, playlists, artists, shows, episodes
 * - Apple Music: albums, playlists
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
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: {
        en: 'Audio URL',
        de: 'Audio-URL',
      },
      admin: {
        placeholder: 'https://open.spotify.com/track/... or https://music.apple.com/...',
        description: {
          en: 'Supports Spotify and Apple Music URLs',
          de: 'Unterstützt Spotify- und Apple Music-URLs',
        },
      },
      validate: validateAudioURL,
    },
  ],
}
