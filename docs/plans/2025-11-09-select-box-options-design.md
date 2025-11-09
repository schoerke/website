# Select Box Option Constants Design

- **Date:** 2025-11-09
- **Status:** IMPLEMENTED

## Overview

Maintain select box option lists as named exports in a single TypeScript file, with type safety and localization support
for both frontend and backend use.

## File Location

- `src/constants/options.ts`

## Type Definitions

```ts
export type LocalizedLabel = {
  de: string
  en: string
}

export type SelectOption = {
  value: string
  label: LocalizedLabel
}
```

## Example Option Lists

```ts
export const instrumentOptions: SelectOption[] = [
  { value: 'piano', label: { de: 'Klavier', en: 'Piano' } },
  { value: 'conductor', label: { de: 'Dirigent', en: 'Conductor' } },
  { value: 'violin', label: { de: 'Violine', en: 'Violin' } },
]

export const roleOptions: SelectOption[] = [
  { value: 'soloist', label: { de: 'Solist', en: 'Soloist' } },
  { value: 'member', label: { de: 'Mitglied', en: 'Member' } },
  // Add more as needed
]
```

## Usage

- Import only the needed list(s):

  ```ts
  import { instrumentOptions, roleOptions, SelectOption } from '@/constants/options'
  ```

- Use `SelectOption` type for props, validation, etc.

## Rationale

- **Single file** keeps option lists organized and easy to maintain
- **Named exports** allow selective imports and tree-shaking
- **TypeScript types** ensure consistency and type safety
- **Localization** via `label` object supports multiple languages
- **Shared usage** for both frontend and backend logic
