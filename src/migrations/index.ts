import * as migration_20260815_125014_artist_repertoire_ordering from './20260815_125014_artist_repertoire_ordering';
import * as migration_20260816_212049_ensure_employee_email_unique from './20260816_212049_ensure_employee_email_unique';
import * as migration_20260819_202221_localize_artist_biography_pdf from './20260819_202221_localize_artist_biography_pdf';
import * as migration_20260820_194949_localize_video_link_label from './20260820_194949_localize_video_link_label';
import * as migration_20260825_195406_remove_autosave_columns from './20260825_195406_remove_autosave_columns';

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
  {
    up: migration_20260819_202221_localize_artist_biography_pdf.up,
    down: migration_20260819_202221_localize_artist_biography_pdf.down,
    name: '20260819_202221_localize_artist_biography_pdf',
  },
  {
    up: migration_20260820_194949_localize_video_link_label.up,
    down: migration_20260820_194949_localize_video_link_label.down,
    name: '20260820_194949_localize_video_link_label',
  },
  {
    up: migration_20260825_195406_remove_autosave_columns.up,
    down: migration_20260825_195406_remove_autosave_columns.down,
    name: '20260825_195406_remove_autosave_columns'
  },
];
