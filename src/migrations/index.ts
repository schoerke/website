import * as migration_20260815_125014_artist_repertoire_ordering from './20260815_125014_artist_repertoire_ordering';

export const migrations = [
  {
    up: migration_20260815_125014_artist_repertoire_ordering.up,
    down: migration_20260815_125014_artist_repertoire_ordering.down,
    name: '20260815_125014_artist_repertoire_ordering'
  },
];
