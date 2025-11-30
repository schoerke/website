import type { Document, Image } from '@/payload-types'

/**
 * Union type representing either an Image or Document from Payload CMS.
 * Useful for fields that can accept both types of media.
 */
export type Media = Image | Document

/**
 * Type guard to check if a media item is an Image.
 * Images have width and height properties.
 */
export function isImage(media: Media): media is Image {
  return 'width' in media && 'height' in media
}

/**
 * Type guard to check if a media item is a Document.
 * Documents don't have width/height properties.
 */
export function isDocument(media: Media): media is Document {
  return !('width' in media)
}
