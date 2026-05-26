import type { Recording } from '@/payload-types'

/**
 * Sorts recordings by year descending, then by creation date descending.
 * Recordings without a year are sorted to the end, ordered by creation date.
 * 
 * @param recordings - Array of recordings to sort
 * @returns Sorted array (descending: newest year first, then newest createdAt)
 * 
 * @example
 * const sorted = sortRecordingsByYearDesc([
 *   { recordingYear: 2016, createdAt: '2024-01-01' },
 *   { recordingYear: 2021, createdAt: '2024-01-02' },
 *   { recordingYear: null, createdAt: '2024-01-03' },
 * ])
 * // Result: [2021, 2016, null]
 */
export function sortRecordingsByYearDesc<T extends Pick<Recording, 'recordingYear' | 'createdAt'>>(
  recordings: T[]
): T[] {
  return [...recordings].sort((a, b) => {
    // Recordings without year treated as year 0 (sorted to end)
    const yearA = a.recordingYear || 0
    const yearB = b.recordingYear || 0

    if (yearA !== yearB) {
      return yearB - yearA // Descending by year
    }

    // Same year or both null - sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
