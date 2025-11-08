export async function createDefaultImage(payload: any, type: string = 'unspecified') {
  // Create a simple 1x1 pixel PNG as default placeholder
  const pngData = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  const media = await payload.create({
    collection: 'media',
    data: {
      alt: `Default ${type.toUpperCase()} Image`,
    },
    file: {
      data: pngData,
      mimetype: 'image/png',
      name: `default-${type}-image.png`,
    },
  })

  return media.id
}
