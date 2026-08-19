import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Returns true if the `downloads_biography_pdf_id` column already exists on
 * `artists_locales`. Used to make `up`/`down` idempotent so re-running the
 * migration is a no-op (safe for repeated builds, including Vercel preview
 * deployments via `build:ci`).
 */
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM pragma_table_info('artists_locales') WHERE name = 'downloads_biography_pdf_id'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  // Idempotency guard: if the localized column already exists, migration already ran. No-op.
  if (await alreadyApplied(db)) {
    return
  }

  // Snapshot count of source values before any change
  const src = await db.run(sql`SELECT COUNT(*) AS c FROM artists WHERE downloads_biography_p_d_f_id IS NOT NULL`)
  const before = (src.rows[0] as unknown as { c: number }).c

  // Add localized column to artists_locales if missing
  await db.run(
    sql`ALTER TABLE artists_locales ADD COLUMN downloads_biography_pdf_id integer REFERENCES documents(id) ON DELETE set null`
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`artists_downloads_downloads_biography_pdf_idx\` ON \`artists_locales\` (\`downloads_biography_pdf_id\`,\`_locale\`);`
  )

  // Upsert values into de locale rows (biography is NOT NULL, so COALESCE)
  await db.run(sql`
    INSERT INTO artists_locales (_parent_id, _locale, downloads_biography_pdf_id, biography)
    SELECT a.id, 'de', a.downloads_biography_p_d_f_id, COALESCE(l.biography, '')
    FROM artists a
    LEFT JOIN artists_locales l ON l._parent_id = a.id AND l._locale = 'de'
    WHERE a.downloads_biography_p_d_f_id IS NOT NULL
    ON CONFLICT (_locale, _parent_id) DO UPDATE SET downloads_biography_pdf_id = excluded.downloads_biography_pdf_id
  `)

  // Verify count matches; fail closed before any destructive step
  const copied = await db.run(
    sql`SELECT COUNT(*) AS c FROM artists_locales WHERE _locale='de' AND downloads_biography_pdf_id IS NOT NULL`
  )
  const after = (copied.rows[0] as unknown as { c: number }).c
  if (before !== after) {
    throw new Error(`bio PDF migration count mismatch: ${before} source vs ${after} copied`)
  }

  // Recreate `artists` without the now-migrated downloads_biography_p_d_f_id column
  // (SQLite forbids DROP COLUMN on an FK-participating column).
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`__new_artists\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`image_id\` integer,
  	\`slug\` text NOT NULL,
  	\`downloads_gallery_z_i_p_id\` integer,
  	\`homepage_u_r_l\` text,
  	\`external_calendar_u_r_l\` text,
  	\`facebook_u_r_l\` text,
  	\`instagram_u_r_l\` text,
  	\`twitter_u_r_l\` text,
  	\`youtube_u_r_l\` text,
  	\`spotify_u_r_l\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`images\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`downloads_gallery_z_i_p_id\`) REFERENCES \`documents\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_artists\`("id", "name", "image_id", "slug", "downloads_gallery_z_i_p_id", "homepage_u_r_l", "external_calendar_u_r_l", "facebook_u_r_l", "instagram_u_r_l", "twitter_u_r_l", "youtube_u_r_l", "spotify_u_r_l", "updated_at", "created_at") SELECT "id", "name", "image_id", "slug", "downloads_gallery_z_i_p_id", "homepage_u_r_l", "external_calendar_u_r_l", "facebook_u_r_l", "instagram_u_r_l", "twitter_u_r_l", "youtube_u_r_l", "spotify_u_r_l", "updated_at", "created_at" FROM \`artists\`;`
  )
  await db.run(sql`DROP TABLE IF EXISTS \`artists\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists\` RENAME TO \`artists\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`artists_name_idx\` ON \`artists\` (\`name\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_image_idx\` ON \`artists\` (\`image_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`artists_slug_idx\` ON \`artists\` (\`slug\`);`)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`artists_downloads_downloads_gallery_z_i_p_idx\` ON \`artists\` (\`downloads_gallery_z_i_p_id\`);`
  )
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_updated_at_idx\` ON \`artists\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_created_at_idx\` ON \`artists\` (\`created_at\`);`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  // Idempotency guard: if the localized column does NOT exist, migration already rolled back. No-op.
  if (!(await alreadyApplied(db))) {
    return
  }

  // Snapshot count of source values before any change
  const src = await db.run(
    sql`SELECT COUNT(*) AS c FROM artists_locales WHERE _locale='de' AND downloads_biography_pdf_id IS NOT NULL`
  )
  const before = (src.rows[0] as unknown as { c: number }).c

  // Recreate `artists` re-adding the legacy non-localized column.
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`__new_artists\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`image_id\` integer,
  	\`slug\` text NOT NULL,
  	\`downloads_biography_p_d_f_id\` integer,
  	\`downloads_gallery_z_i_p_id\` integer,
  	\`homepage_u_r_l\` text,
  	\`external_calendar_u_r_l\` text,
  	\`facebook_u_r_l\` text,
  	\`instagram_u_r_l\` text,
  	\`twitter_u_r_l\` text,
  	\`youtube_u_r_l\` text,
  	\`spotify_u_r_l\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`images\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`downloads_biography_p_d_f_id\`) REFERENCES \`documents\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`downloads_gallery_z_i_p_id\`) REFERENCES \`documents\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_artists\`("id", "name", "image_id", "slug", "downloads_biography_p_d_f_id", "downloads_gallery_z_i_p_id", "homepage_u_r_l", "external_calendar_u_r_l", "facebook_u_r_l", "instagram_u_r_l", "twitter_u_r_l", "youtube_u_r_l", "spotify_u_r_l", "updated_at", "created_at") SELECT "id", "name", "image_id", "slug", NULL, "downloads_gallery_z_i_p_id", "homepage_u_r_l", "external_calendar_u_r_l", "facebook_u_r_l", "instagram_u_r_l", "twitter_u_r_l", "youtube_u_r_l", "spotify_u_r_l", "updated_at", "created_at" FROM \`artists\`;`
  )
  await db.run(sql`DROP TABLE IF EXISTS \`artists\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists\` RENAME TO \`artists\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`artists_name_idx\` ON \`artists\` (\`name\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_image_idx\` ON \`artists\` (\`image_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`artists_slug_idx\` ON \`artists\` (\`slug\`);`)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`artists_downloads_downloads_biography_p_d_f_idx\` ON \`artists\` (\`downloads_biography_p_d_f_id\`);`
  )
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`artists_downloads_downloads_gallery_z_i_p_idx\` ON \`artists\` (\`downloads_gallery_z_i_p_id\`);`
  )
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_updated_at_idx\` ON \`artists\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_created_at_idx\` ON \`artists\` (\`created_at\`);`)

  // Copy de locale values back into the legacy column
  await db.run(sql`
    UPDATE artists SET downloads_biography_p_d_f_id = (
      SELECT downloads_biography_pdf_id FROM artists_locales WHERE _locale='de' AND _parent_id = artists.id
    )
  `)

  // Verify count matches; fail closed before dropping the localized column
  const copied = await db.run(sql`SELECT COUNT(*) AS c FROM artists WHERE downloads_biography_p_d_f_id IS NOT NULL`)
  const after = (copied.rows[0] as unknown as { c: number }).c
  if (before !== after) {
    throw new Error(`bio PDF migration down: count mismatch ${before} source vs ${after} copied`)
  }

  // Recreate `artists_locales` without the localized column
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`__new_artists_locales\` (
  	\`quote\` text,
  	\`biography\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`artists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(
    sql`INSERT INTO \`__new_artists_locales\`("quote", "biography", "id", "_locale", "_parent_id") SELECT "quote", "biography", "id", "_locale", "_parent_id" FROM \`artists_locales\`;`
  )
  await db.run(sql`DROP TABLE IF EXISTS \`artists_locales\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists_locales\` RENAME TO \`artists_locales\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS \`artists_locales_locale_parent_id_unique\` ON \`artists_locales\` (\`_locale\`,\`_parent_id\`);`
  )
}
