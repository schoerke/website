import { describe, expect, it } from 'vitest'
import { revalidate } from './page'

describe('ArtistDetailPage', () => {
  it('revalidates within one day so the derived concert season updates', () => {
    expect(revalidate).toBe(86400)
  })
})
