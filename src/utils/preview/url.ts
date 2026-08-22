interface GeneratePreviewPathArgs {
  data: { slug?: string }
  req: { locale?: string }
  collection: string
}

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
