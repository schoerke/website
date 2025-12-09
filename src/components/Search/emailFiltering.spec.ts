import type { SearchDoc } from '@/services/search'
import { describe, expect, it } from 'vitest'
import { filterEmailCommands } from './emailFiltering'

describe('Email Command Filtering Logic', () => {
  const mockEmployees = [
    { id: 4, name: 'Eva Wagner', email: 'e.wagner@ks-schoerke.de' },
    { id: 3, name: 'Justine Stemmelin', email: 'j.stemmelin@ks-schoerke.de' },
    { id: 2, name: 'Veronika Fischer', email: 'v.fischer@ks-schoerke.de' },
    { id: 1, name: 'Tina Nurnus', email: 't.nurnus@ks-schoerke.de' },
  ]

  describe('Discovery Mode (email/mail/command searches)', () => {
    it('should return all employees when query includes "email"', () => {
      const result = filterEmailCommands('email', mockEmployees, [])
      expect(result).toHaveLength(4)
      expect(result).toEqual(mockEmployees)
    })

    it('should return all employees when query includes "mail"', () => {
      const result = filterEmailCommands('mail me', mockEmployees, [])
      expect(result).toHaveLength(4)
    })

    it('should return all employees when query includes "command"', () => {
      const result = filterEmailCommands('command', mockEmployees, [])
      expect(result).toHaveLength(4)
    })

    it('should return all employees when query includes "commands"', () => {
      const result = filterEmailCommands('show commands', mockEmployees, [])
      expect(result).toHaveLength(4)
    })

    it('should return all employees when query includes "befehl" (German)', () => {
      const result = filterEmailCommands('befehl', mockEmployees, [])
      expect(result).toHaveLength(4)
    })

    it('should work case-insensitively for "EMAIL"', () => {
      const result = filterEmailCommands('EMAIL', mockEmployees, [])
      expect(result).toHaveLength(4)
    })

    it('should work case-insensitively for "COMMANDS"', () => {
      const result = filterEmailCommands('COMMANDS', mockEmployees, [])
      expect(result).toHaveLength(4)
    })
  })

  describe('Direct Name Match', () => {
    it('should return only Eva Wagner when searching "wagner"', () => {
      const result = filterEmailCommands('wagner', mockEmployees, [])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Eva Wagner')
    })

    it('should return Justine Stemmelin when searching "justine"', () => {
      const result = filterEmailCommands('justine', mockEmployees, [])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Justine Stemmelin')
    })

    it('should work case-insensitively', () => {
      const result = filterEmailCommands('WAGNER', mockEmployees, [])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Eva Wagner')
    })

    it('should match partial names', () => {
      const result = filterEmailCommands('ste', mockEmployees, [])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Justine Stemmelin')
    })
  })

  describe('Contextual Filtering (Contact Persons)', () => {
    it('should return contact persons for found piano artists', () => {
      const searchResults: SearchDoc[] = [
        {
          id: '20',
          title: 'Tzimon Barto',
          relationTo: 'artists',
          relationId: '4',
          slug: 'tzimon-barto',
          priority: 50,
          contactPersons: [
            { id: 4, name: 'Eva Wagner', email: 'e.wagner@ks-schoerke.de' },
            { id: 3, name: 'Justine Stemmelin', email: 'j.stemmelin@ks-schoerke.de' },
          ],
        },
        {
          id: '4',
          title: 'Till Fellner',
          relationTo: 'artists',
          relationId: '6',
          slug: 'till-fellner',
          priority: 50,
          contactPersons: [
            { id: 4, name: 'Eva Wagner', email: 'e.wagner@ks-schoerke.de' },
            { id: 2, name: 'Veronika Fischer', email: 'v.fischer@ks-schoerke.de' },
          ],
        },
      ]

      const result = filterEmailCommands('piano', mockEmployees, searchResults)

      // Should return unique contact persons: Eva Wagner (4), Justine Stemmelin (3), Veronika Fischer (2)
      expect(result).toHaveLength(3)
      expect(result.map((e) => e.id).sort()).toEqual([2, 3, 4])
    })

    it('should handle single artist with contact persons', () => {
      const searchResults: SearchDoc[] = [
        {
          id: '4',
          title: 'Christian Zacharias',
          relationTo: 'artists',
          relationId: '20',
          slug: 'christian-zacharias',
          priority: 50,
          contactPersons: [
            { id: 4, name: 'Eva Wagner', email: 'e.wagner@ks-schoerke.de' },
            { id: 3, name: 'Justine Stemmelin', email: 'j.stemmelin@ks-schoerke.de' },
          ],
        },
      ]

      const result = filterEmailCommands('zacharias', mockEmployees, searchResults)

      expect(result).toHaveLength(2)
      expect(result.map((e) => e.name)).toContain('Eva Wagner')
      expect(result.map((e) => e.name)).toContain('Justine Stemmelin')
    })

    it('should handle artists without contact persons', () => {
      const searchResults: SearchDoc[] = [
        {
          id: '10',
          title: 'Some Artist',
          relationTo: 'artists',
          relationId: '99',
          slug: 'some-artist',
          priority: 50,
          // No contactPersons field
        },
      ]

      const result = filterEmailCommands('artist', mockEmployees, searchResults)

      expect(result).toHaveLength(0)
    })
  })

  describe('Clutter Prevention', () => {
    it('should return empty array for generic searches without matches', () => {
      const searchResults: SearchDoc[] = [
        {
          id: '10',
          title: 'Impressum',
          relationTo: 'pages',
          relationId: '5',
          slug: 'impressum',
          priority: 25,
        },
      ]

      const result = filterEmailCommands('impressum', mockEmployees, searchResults)

      expect(result).toHaveLength(0)
    })

    it('should return empty array for queries shorter than 3 characters', () => {
      const result = filterEmailCommands('ab', mockEmployees, [])
      expect(result).toHaveLength(0)
    })

    it('should return empty array for empty query', () => {
      const result = filterEmailCommands('', mockEmployees, [])
      expect(result).toHaveLength(0)
    })
  })

  describe('Combined Filtering', () => {
    it('should combine name match and contact person filtering', () => {
      const searchResults: SearchDoc[] = [
        {
          id: '20',
          title: 'Tzimon Barto',
          relationTo: 'artists',
          relationId: '4',
          slug: 'tzimon-barto',
          priority: 50,
          contactPersons: [{ id: 2, name: 'Veronika Fischer', email: 'v.fischer@ks-schoerke.de' }],
        },
      ]

      // Query matches "Wagner" by name AND Fischer is a contact person
      const result = filterEmailCommands('wagner', mockEmployees, searchResults)

      // Should return both: Eva Wagner (name match) + Veronika Fischer (contact person)
      expect(result).toHaveLength(2)
      expect(result.map((e) => e.name).sort()).toEqual(['Eva Wagner', 'Veronika Fischer'])
    })
  })
})
