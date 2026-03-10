/**
 * Fisher-Yates shuffle — returns a new array in random order.
 *
 * @param array - The array to shuffle
 * @returns A new array with the same elements in random order
 *
 * @example
 * ```ts
 * const shuffled = shuffleArray([1, 2, 3, 4, 5])
 * ```
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
