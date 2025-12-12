import * as migration_20251212_230914 from './20251212_230914';

export const migrations = [
  {
    up: migration_20251212_230914.up,
    down: migration_20251212_230914.down,
    name: '20251212_230914'
  },
];
