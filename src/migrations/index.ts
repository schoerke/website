import * as migration_20260815_125014_artist_repertoire_ordering from './20260815_125014_artist_repertoire_ordering'
import * as migration_20260816_212049_ensure_employee_email_unique from './20260816_212049_ensure_employee_email_unique'

export const migrations = [
  {
    up: migration_20260815_125014_artist_repertoire_ordering.up,
    down: migration_20260815_125014_artist_repertoire_ordering.down,
    name: '20260815_125014_artist_repertoire_ordering',
  },
  {
    up: migration_20260816_212049_ensure_employee_email_unique.up,
    down: migration_20260816_212049_ensure_employee_email_unique.down,
    name: '20260816_212049_ensure_employee_email_unique',
  },
]
