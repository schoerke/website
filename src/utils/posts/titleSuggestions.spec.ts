import { describe, expect, it } from 'vitest'
import { filterTitleSuggestions, type TitleSuggestion } from './titleSuggestions'

const titles: TitleSuggestion[] = [
  { id: 1, title: 'Quartett für Streicher', categories: ['news'] },
  { id: 2, title: 'Quartet in Paris', categories: ['projects'] },
  { id: 3, title: 'Müller trifft Brahms', categories: ['news'] },
  { id: 4, title: 'Konzert mit François', categories: ['news'] },
  { id: 5, title: 'Quartett', categories: [] },
]

describe('filterTitleSuggestions', () => {
  it('returns [] for fewer than 3 chars', () => {
    expect(filterTitleSuggestions('qu', titles)).toEqual([])
    expect(filterTitleSuggestions('', titles)).toEqual([])
    expect(filterTitleSuggestions('  ', titles)).toEqual([])
  })

  it('matches normalized contains (diacritic-insensitive)', () => {
    const result = filterTitleSuggestions('müller', titles)
    expect(result.map(t => t.id)).toEqual([3])
  })

  it('matches near-duplicates regardless of diacritics in the stored title', () => {
    const result = filterTitleSuggestions('quartet', titles)
    expect(result.map(t => t.id).sort()).toEqual([1, 2, 5].sort())
  })

  it('excludes the current doc by id', () => {
    const result = filterTitleSuggestions('quartett', titles, 5)
    expect(result.map(t => t.id)).toEqual([1])
  })

  it('returns [] when nothing matches', () => {
    expect(filterTitleSuggestions('xyzzy', titles)).toEqual([])
  })
})