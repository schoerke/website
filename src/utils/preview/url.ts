interface GeneratePreviewPathArgs {
  data: { slug?: string }
  req: { locale?: string }
  collection: string
}

/**
 * Builds a Payload preview API URL for a post.
 *
 * Returns undefined when the post has no slug or when NEXT_PUBLIC_SERVER_URL /
 * PREVIEW_SECRET is not configured. Falls back to the 'de' locale when the
 * request locale is not 'de' or 'en'.
 *
 * @param args - Preview path arguments
 * @param args.data - Post data containing the slug
 * @param args.req - Request object carrying the locale
 * @param args.collection - Payload collection name
 * @returns The absolute preview API URL, or undefined if not buildable
 *
 * @example
 * generatePostPreviewPath({
 *   data: { slug: 'hello-world' },
 *   req: { locale: 'en' },
 *   collection: 'posts',
 * })
 * // 'https://example.com/api/preview?path=%2Fen%2Fpreview%2Fhello-world&previewSecret=...&collection=posts'
 */
export function generatePostPreviewPath({ data, req, collection }: GeneratePreviewPathArgs): string | undefined {
  if (!data.slug) return undefined

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL
  const previewSecret = process.env.PREVIEW_SECRET
  if (!serverUrl || !previewSecret) return undefined

  const locale = req.locale === 'de' || req.locale === 'en' ? req.locale : 'de'
  const path = `/${locale}/preview/${data.slug}`

  const params = new URLSearchParams({
    previewSecret,
    collection,
  })

  return `${serverUrl}/api/preview?path=${encodeURIComponent(path)}&${params.toString()}`
}
